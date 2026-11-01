import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import type { Request } from 'express'
import { UserModel } from '../models/User.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { loginSchema, registerSchema } from '../schemas/auth.js'
import { validateBody } from '../middleware/validate.js'
import { requireDb } from '../middleware/auth.js'
import { AppError, conflict, unauthorized } from '../errors.js'
import { config } from '../config.js'

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: config.isTest ? 1000 : 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a few minutes.' },
    })
  },
})

function regenerate(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()))
  })
}

function save(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()))
  })
}

function publicUser(user: { id?: string; _id?: unknown; email: string; displayName: string }) {
  return {
    id: String(user.id ?? user._id),
    email: user.email,
    displayName: user.displayName,
  }
}

export const authRouter = Router()

authRouter.post('/register', requireDb, authLimiter, validateBody(registerSchema), async (req, res) => {
  const { email, password, displayName } = req.body as {
    email: string
    password: string
    displayName: string
  }

  const existing = await UserModel.exists({ email })
  if (existing) {
    throw conflict('EMAIL_TAKEN', 'An account with that email already exists.')
  }

  const passwordHash = await hashPassword(password)
  let user
  try {
    user = await UserModel.create({ email, passwordHash, displayName })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      throw conflict('EMAIL_TAKEN', 'An account with that email already exists.')
    }
    throw error
  }

  await regenerate(req)
  req.session.userId = String(user._id)
  await save(req)

  res.status(201).json({ user: publicUser({ id: String(user._id), email: user.email, displayName: user.displayName }) })
})

authRouter.post('/login', requireDb, authLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body as { email: string; password: string }

  const user = await UserModel.findOne({ email }).select('+passwordHash')
  if (!user) {
    throw unauthorized('Email or password is incorrect.')
  }

  const valid = await verifyPassword(user.passwordHash, password)
  if (!valid) {
    throw unauthorized('Email or password is incorrect.')
  }

  await regenerate(req)
  req.session.userId = String(user._id)
  await save(req)

  res.status(200).json({
    user: publicUser({ id: String(user._id), email: user.email, displayName: user.displayName }),
  })
})

authRouter.post('/logout', (req, res, next) => {
  req.session.destroy((error) => {
    if (error) {
      next(new AppError(500, 'LOGOUT_FAILED', 'Could not sign out. Please try again.'))
      return
    }
    res.clearCookie(config.sessionCookieName, { path: '/' })
    res.status(204).end()
  })
})

authRouter.get('/me', requireDb, async (req, res) => {
  if (!req.session.userId) {
    res.status(200).json({ user: null })
    return
  }

  const user = await UserModel.findById(req.session.userId)
  if (!user) {
    req.session.destroy(() => undefined)
    res.status(200).json({ user: null })
    return
  }

  res.status(200).json({
    user: publicUser({ id: String(user._id), email: user.email, displayName: user.displayName }),
  })
})
