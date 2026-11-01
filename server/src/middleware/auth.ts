import type { NextFunction, Request, Response } from 'express'
import { isDbReady } from '../db.js'
import { unauthorized, unavailable } from '../errors.js'

export function requireDb(_req: Request, _res: Response, next: NextFunction): void {
  if (!isDbReady()) {
    next(unavailable())
    return
  }
  next()
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    next(unauthorized('Sign in to continue'))
    return
  }
  next()
}
