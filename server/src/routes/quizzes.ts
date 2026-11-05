import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import mongoose, { Types } from 'mongoose'
import type { ClientSession } from 'mongoose'
import { CourseModel } from '../models/Course.js'
import { LessonModel } from '../models/Lesson.js'
import { QuizModel } from '../models/Quiz.js'
import { QuizAttemptModel } from '../models/QuizAttempt.js'
import type { QuizAttempt } from '../models/QuizAttempt.js'
import { requireAuth, requireDb } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { AppError, conflict, notFound, unauthorized } from '../errors.js'
import { config } from '../config.js'
import { routeParam } from '../lib/http.js'
import {
  canonicalAnswersEqual,
  QuizAnswerError,
  scoreQuiz,
  toPublicQuiz,
  type QuizDefinition,
} from '../lib/quiz.js'
import {
  awardQuizPassRewards,
  evaluateCourseCompletion,
  getXpTotal,
} from '../lib/rewards.js'
import { logger } from '../logger.js'
import { quizAttemptSchema } from '../schemas/quiz.js'

const attemptLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: config.isTest ? 1000 : 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a few minutes.' },
    })
  },
})

function quizIdentifier(value: string): Record<string, unknown> {
  if (Types.ObjectId.isValid(value) && value.length === 24) {
    return { $or: [{ slug: value }, { _id: new Types.ObjectId(value) }] }
  }
  return { slug: value }
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  )
}

interface AccessibleQuiz {
  quiz: QuizDefinition & { _id: Types.ObjectId }
  lesson: { isPreview: boolean; slug: string } | null
}

async function findAccessibleQuiz(
  quizId: string,
  userId: string | undefined,
): Promise<AccessibleQuiz> {
  const quiz = await QuizModel.findOne({
    ...quizIdentifier(quizId),
    status: 'published',
  }).lean()

  if (!quiz) {
    throw notFound('Quiz not found')
  }

  const course = await CourseModel.findOne({
    slug: quiz.courseSlug,
    status: 'published',
  })
    .select('_id')
    .lean()

  if (!course) {
    throw notFound('Quiz not found')
  }

  let lesson: { isPreview: boolean; slug: string } | null = null
  if (quiz.kind === 'lesson') {
    if (!quiz.lessonSlug) {
      throw notFound('Quiz not found')
    }
    lesson = await LessonModel.findOne({
      slug: quiz.lessonSlug,
      courseSlug: quiz.courseSlug,
      status: 'published',
    })
      .select('slug isPreview')
      .lean()
    if (!lesson) {
      throw notFound('Quiz not found')
    }
  }

  if (!userId && (!lesson || !lesson.isPreview)) {
    throw unauthorized('Sign in to continue')
  }

  return { quiz: quiz as unknown as QuizDefinition & { _id: Types.ObjectId }, lesson }
}

function setQuizCacheHeaders(res: {
  set: (name: string, value: string) => unknown
}): void {
  res.set('Cache-Control', 'private, no-store')
  res.set('Vary', 'Cookie')
}

async function attemptSummary(userId: string, quizId: Types.ObjectId) {
  const attempts = await QuizAttemptModel.find({ userId, quizId })
    .select('percent passed completedAt')
    .sort({ completedAt: -1 })
    .lean()

  if (attempts.length === 0) return null
  return {
    attempts: attempts.length,
    bestPercent: Math.max(...attempts.map((attempt) => attempt.percent)),
    passed: attempts.some((attempt) => attempt.passed),
    lastAttemptAt: attempts[0]?.completedAt ?? null,
  }
}

async function replayResponse(
  attempt: QuizAttempt,
  replayed: boolean,
  xpAwarded = 0,
  achievementsAwarded: Array<{ slug: string; title: string }> = [],
) {
  const totalXp = await getXpTotal(String(attempt.userId))
  return {
    attemptKey: attempt.attemptKey,
    replayed,
    quizSlug: attempt.quizSlug,
    score: attempt.score,
    total: attempt.total,
    percent: attempt.percent,
    passed: attempt.passed,
    feedback: attempt.feedback,
    xpAwarded,
    totalXp,
    achievementsAwarded,
  }
}

async function findExistingAttempt(
  userId: string,
  quizId: Types.ObjectId,
  attemptKey: string,
): Promise<QuizAttempt | null> {
  return QuizAttemptModel.findOne({ userId, quizId, attemptKey }).lean() as Promise<QuizAttempt | null>
}

function storedAnswersMatch(
  attempt: QuizAttempt,
  submitted: Array<{ questionId: string; selectedOptionId: string }>,
): boolean {
  return canonicalAnswersEqual(
    attempt.answers.map((answer) => ({
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId,
    })),
    submitted,
  )
}

function reusedAttemptKeyConflict(): AppError {
  return conflict(
    'ATTEMPT_KEY_REUSED',
    'This attempt key was already used with different answers. Start a new attempt.',
  )
}

export const quizzesRouter = Router()

quizzesRouter.get('/:quizId', requireDb, async (req, res) => {
  setQuizCacheHeaders(res)
  const userId = req.session.userId
  const { quiz } = await findAccessibleQuiz(routeParam(req, 'quizId'), userId)

  res.json({
    quiz: toPublicQuiz(quiz),
    viewer: { authenticated: Boolean(userId) },
    attemptSummary: userId ? await attemptSummary(userId, quiz._id) : null,
  })
})

quizzesRouter.post(
  '/:quizId/attempts',
  requireDb,
  requireAuth,
  attemptLimiter,
  validateBody(quizAttemptSchema),
  async (req, res) => {
    setQuizCacheHeaders(res)
    const userId = req.session.userId as string
    const { quiz } = await findAccessibleQuiz(routeParam(req, 'quizId'), userId)
    const input = req.body as {
      attemptKey: string
      answers: Array<{ questionId: string; optionId: string }>
    }

    let scored
    try {
      scored = scoreQuiz(quiz, input.answers)
    } catch (error) {
      if (error instanceof QuizAnswerError) {
        throw new AppError(400, 'VALIDATION_ERROR', error.message)
      }
      throw error
    }

    const existing = await findExistingAttempt(userId, quiz._id, input.attemptKey)
    if (existing) {
      if (!storedAnswersMatch(existing, scored.answers)) {
        throw reusedAttemptKeyConflict()
      }
      res.status(200).json(await replayResponse(existing, true))
      return
    }

    const session: ClientSession = await mongoose.startSession()
    let storedAttempt: QuizAttempt | null = null
    let created = false
    let xpAwarded = 0
    let achievementsAwarded: Array<{ slug: string; title: string }> = []

    try {
      // A duplicate key can come from the attempt itself or from a reward
      // unique index when two different attempt keys pass concurrently. If the
      // attempt is not present, the transaction aborted before commit and can be
      // retried safely; the reward upserts then see the existing event.
      for (let transactionAttempt = 0; transactionAttempt < 3; transactionAttempt += 1) {
        storedAttempt = null
        created = false
        xpAwarded = 0
        achievementsAwarded = []

        try {
          await session.withTransaction(async () => {
            storedAttempt = null
            created = false
            xpAwarded = 0
            achievementsAwarded = []

            const current = await QuizAttemptModel.findOne({
              userId,
              quizId: quiz._id,
              attemptKey: input.attemptKey,
            })
              .session(session)
              .lean()

            if (current) {
              const stored = current as unknown as QuizAttempt
              if (!storedAnswersMatch(stored, scored.answers)) {
                throw reusedAttemptKeyConflict()
              }
              storedAttempt = stored
              return
            }

            const [attempt] = await QuizAttemptModel.create(
              [
                {
                  userId,
                  quizId: quiz._id,
                  quizSlug: quiz.slug,
                  quizVersion: quiz.version ?? 1,
                  courseSlug: quiz.courseSlug,
                  ...(quiz.lessonSlug ? { lessonSlug: quiz.lessonSlug } : {}),
                  attemptKey: input.attemptKey,
                  answers: scored.answers,
                  feedback: scored.feedback,
                  score: scored.score,
                  total: scored.total,
                  percent: scored.percent,
                  passed: scored.passed,
                  completedAt: new Date(),
                },
              ],
              { session },
            )

            storedAttempt = attempt.toObject() as unknown as QuizAttempt
            created = true

            if (scored.passed) {
              const reward = await awardQuizPassRewards(userId, quiz, session)
              xpAwarded = reward.xpAwarded
              achievementsAwarded = reward.achievementsAwarded
            }
          })
          break
        } catch (error) {
          if (!isDuplicateKey(error)) throw error

          const original = await findExistingAttempt(userId, quiz._id, input.attemptKey)
          if (original) {
            if (!storedAnswersMatch(original, scored.answers)) {
              throw reusedAttemptKeyConflict()
            }
            res.status(200).json(await replayResponse(original, true))
            return
          }

          if (transactionAttempt === 2) throw error
        }
      }
    } finally {
      await session.endSession()
    }

    if (!storedAttempt) {
      throw new AppError(500, 'INTERNAL_ERROR', 'The attempt could not be saved.')
    }

    const attempt = storedAttempt as QuizAttempt

    // The attempt transaction has committed. For a passing course assessment,
    // reconcile course completion again outside that transaction. The lesson
    // completion route also reconciles after its progress write commits, so at
    // least one of the two post-commit calls observes both completion events.
    // Unique XP and achievement indexes make these awards idempotent.
    let completionXp = 0
    let completionAchievements: Array<{ slug: string; title: string }> = []
    let totalXp = await getXpTotal(userId)
    if (scored.passed && quiz.kind === 'course') {
      try {
        const completion = await evaluateCourseCompletion(userId, quiz.courseSlug)
        completionXp = completion.xpAwarded
        completionAchievements = completion.achievementsAwarded
        totalXp = completion.totalXp
      } catch (error) {
        logger.error(
          { err: error, userId, courseSlug: quiz.courseSlug },
          'course completion reconciliation failed',
        )
      }
    }

    res.status(created ? 201 : 200).json({
      attemptKey: attempt.attemptKey,
      replayed: !created,
      quizSlug: attempt.quizSlug,
      score: attempt.score,
      total: attempt.total,
      percent: attempt.percent,
      passed: attempt.passed,
      feedback: attempt.feedback,
      xpAwarded: (created ? xpAwarded : 0) + completionXp,
      totalXp,
      achievementsAwarded: created
        ? [...achievementsAwarded, ...completionAchievements]
        : completionAchievements,
    })
  },
)

quizzesRouter.get('/:quizId/results', requireDb, requireAuth, async (req, res) => {
  setQuizCacheHeaders(res)
  const userId = req.session.userId as string
  const { quiz } = await findAccessibleQuiz(routeParam(req, 'quizId'), userId)

  const attempts = await QuizAttemptModel.find({ userId, quizId: quiz._id })
    .sort({ completedAt: -1 })
    .limit(20)
    .lean()

  res.json({
    quizSlug: quiz.slug,
    passed: attempts.some((attempt) => attempt.passed),
    bestPercent:
      attempts.length === 0 ? 0 : Math.max(...attempts.map((attempt) => attempt.percent)),
    attempts: attempts.map((attempt) => ({
      attemptKey: attempt.attemptKey,
      score: attempt.score,
      total: attempt.total,
      percent: attempt.percent,
      passed: attempt.passed,
      completedAt: attempt.completedAt,
      feedback: attempt.feedback,
    })),
  })
})
