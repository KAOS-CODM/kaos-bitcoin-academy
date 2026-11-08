import { Router } from 'express'
import type { Request } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { config } from '../config.js'
import { AppError } from '../errors.js'
import { logger } from '../logger.js'
import { requireAuth } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import {
  openRouterTutorProvider,
  TutorProviderError,
  type TutorProvider,
} from '../lib/openrouter.js'
import {
  buildTutorContext,
  type TutorContextProvider,
} from '../lib/tutorContext.js'
import { buildTutorMessages } from '../lib/tutorPrompt.js'
import { tutorChatSchema, type TutorChatInput } from '../schemas/tutor.js'

export interface TutorRouterOptions {
  enabled?: boolean
  apiKey?: string
  provider?: TutorProvider
  contextProvider?: TutorContextProvider
}

const TEN_MINUTES = 10 * 60 * 1000
const ONE_DAY = 24 * 60 * 60 * 1000

function learnerKey(req: Request): string {
  if (req.session?.userId) return `user:${req.session.userId}`
  return `ip:${ipKeyGenerator(req.ip ?? '')}`
}

function limitHandler(message: string) {
  return (_req: Request, res: import('express').Response) => {
    res.status(429).json({
      error: { code: 'AI_RATE_LIMITED', message },
    })
  }
}

export function createTutorRouter(options: TutorRouterOptions = {}): Router {
  const router = Router()
  const enabled = options.enabled ?? config.aiEnabled
  const apiKey = options.apiKey ?? config.openRouterApiKey ?? ''
  const provider = options.provider ?? openRouterTutorProvider
  const contextProvider = options.contextProvider ?? buildTutorContext

  const burstLimiter = rateLimit({
    windowMs: TEN_MINUTES,
    limit: config.isTest ? 1_000 : 12,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: learnerKey,
    handler: limitHandler('Too many tutor questions. Please wait a few minutes and try again.'),
  })

  const dailyLimiter = rateLimit({
    windowMs: ONE_DAY,
    limit: config.isTest ? 1_000 : 50,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: learnerKey,
    handler: limitHandler(
      'You have reached the daily tutor limit. Please continue with the lessons and try again tomorrow.',
    ),
  })

  router.post(
    '/chat',
    requireAuth,
    (_req, _res, next) => {
      if (!enabled || !apiKey) {
        next(
          new AppError(
            503,
            'AI_DISABLED',
            'The AI Tutor is not enabled on this deployment yet.',
          ),
        )
        return
      }
      next()
    },
    burstLimiter,
    dailyLimiter,
    validateBody(tutorChatSchema),
    async (req, res) => {
      const { message, lessonSlug, history } = req.body as TutorChatInput

      const context = await contextProvider(lessonSlug)
      const messages = buildTutorMessages({ message, history, context })

      let reply: string
      try {
        reply = await provider.complete({ apiKey, messages })
      } catch (error) {
        if (error instanceof TutorProviderError) {
          throw new AppError(
            503,
            'AI_UNAVAILABLE',
            'The AI Tutor is temporarily unavailable. Please try again shortly.',
          )
        }
        throw error
      }

      if (!reply.trim()) {
        throw new AppError(
          503,
          'AI_UNAVAILABLE',
          'The AI Tutor is temporarily unavailable. Please try again shortly.',
        )
      }

      logger.info(
        {
          lessonSlug: context.lessonSlug,
          historyMessages: history.length,
          replyCharacters: reply.length,
        },
        'AI tutor reply sent',
      )

      res.set('Cache-Control', 'no-store')
      res.status(200).json({
        reply,
        context: {
          lessonSlug: context.lessonSlug,
          lessonTitle: context.lessonTitle,
          courseTitle: context.courseTitle,
        },
      })
    },
  )

  return router
}

export const tutorRouter = createTutorRouter()
