import type { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import { ZodError } from 'zod'
import { AppError } from '../errors.js'
import { logger } from '../logger.js'

export function apiNotFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'NOT_FOUND', 'Endpoint not found'))
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error)
    return
  }

  if (error instanceof AppError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    })
    return
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please check the highlighted fields.',
        details: {
          fields: error.issues.map((issue) => ({
            path: issue.path.join('.') || '(body)',
            message: issue.message,
          })),
        },
      },
    })
    return
  }

  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({
      error: { code: 'INVALID_IDENTIFIER', message: 'That identifier is not valid.' },
    })
    return
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  ) {
    res.status(409).json({
      error: { code: 'DUPLICATE', message: 'That record already exists.' },
    })
    return
  }

  logger.error({ err: error, method: req.method, path: req.path }, 'unhandled request error')
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
  })
}
