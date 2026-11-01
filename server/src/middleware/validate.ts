import type { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'
import { AppError } from '../errors.js'

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      next(
        new AppError(400, 'VALIDATION_ERROR', 'Please check the highlighted fields.', {
          fields: result.error.issues.map((issue) => ({
            path: issue.path.join('.') || '(body)',
            message: issue.message,
          })),
        }),
      )
      return
    }
    req.body = result.data
    next()
  }
}
