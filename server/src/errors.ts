export class AppError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const notFound = (message = 'Resource not found') =>
  new AppError(404, 'NOT_FOUND', message)

export const unauthorized = (message = 'Authentication required') =>
  new AppError(401, 'UNAUTHORIZED', message)

export const forbidden = (message = 'Not allowed') =>
  new AppError(403, 'FORBIDDEN', message)

export const conflict = (code: string, message: string) =>
  new AppError(409, code, message)

export const unavailable = (message = 'The database is temporarily unavailable') =>
  new AppError(503, 'DB_UNAVAILABLE', message)
