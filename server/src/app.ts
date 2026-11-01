import { existsSync } from 'node:fs'
import path from 'node:path'
import express from 'express'
import type { Express } from 'express'
import helmet from 'helmet'
import session from 'express-session'
import type { Store } from 'express-session'
import { pinoHttp } from 'pino-http'
import { config } from './config.js'
import { logger } from './logger.js'
import { isDbReady } from './db.js'
import { originGuard } from './middleware/origin.js'
import { apiNotFound, errorHandler } from './middleware/errors.js'
import { authRouter } from './routes/auth.js'
import { coursesRouter } from './routes/courses.js'
import { lessonsRouter } from './routes/lessons.js'
import { progressRouter } from './routes/progress.js'
import { dashboardRouter } from './routes/dashboard.js'

export interface AppOptions {
  sessionStore?: Store
  clientDist?: string | null
}

const SECONDS_PER_DAY = 60 * 60 * 24

export function createApp(options: AppOptions = {}): Express {
  const app = express()

  // Render terminates TLS and forwards one hop; trusting it makes req.secure and
  // req.ip correct so Secure cookies and rate limiting behave.
  app.set('trust proxy', config.isProd ? 1 : 0)
  app.disable('x-powered-by')

  app.use(
    helmet({
      contentSecurityPolicy: config.isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'"],
              imgSrc: ["'self'", 'data:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  )

  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/api/health',
      },
    }),
  )

  app.use(express.json({ limit: '32kb' }))

  app.use(
    session({
      name: config.sessionCookieName,
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: options.sessionStore,
      cookie: {
        httpOnly: true,
        secure: config.isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * SECONDS_PER_DAY * 1000,
      },
    }),
  )

  app.use(originGuard)

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', db: isDbReady() ? 'up' : 'down' })
  })

  app.use('/api/auth', authRouter)
  app.use('/api/courses', coursesRouter)
  app.use('/api/lessons', lessonsRouter)
  app.use('/api/progress', progressRouter)
  app.use('/api/dashboard', dashboardRouter)

  app.use('/api', apiNotFound)

  const clientDist = options.clientDist === undefined ? config.clientDist : options.clientDist
  const indexHtml = clientDist ? path.join(clientDist, 'index.html') : null

  if (clientDist && indexHtml && existsSync(indexHtml)) {
    app.use(
      express.static(clientDist, {
        index: false,
        maxAge: config.isProd ? '1h' : 0,
      }),
    )
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) {
        next()
        return
      }
      res.sendFile(indexHtml)
    })
  }

  app.use(errorHandler)

  return app
}
