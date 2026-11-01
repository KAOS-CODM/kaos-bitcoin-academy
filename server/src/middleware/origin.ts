import type { NextFunction, Request, Response } from 'express'
import { config } from '../config.js'
import { AppError } from '../errors.js'

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function hostOf(value: string): string | null {
  try {
    return new URL(value).host
  } catch {
    return null
  }
}

/**
 * CSRF defence for a cookie/session app:
 *  - SameSite=Lax on the session cookie,
 *  - JSON-only mutations (browser form posts cannot set that content type without CORS),
 *  - Origin checked against the request host and configured origins.
 */
export function originGuard(req: Request, _res: Response, next: NextFunction): void {
  if (!MUTATING.has(req.method)) {
    next()
    return
  }

  const length = Number(req.get('content-length') ?? '0')
  if (length > 0) {
    const contentType = req.get('content-type') ?? ''
    if (!contentType.toLowerCase().includes('application/json')) {
      next(new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Requests must be sent as JSON.'))
      return
    }
  }

  const origin = req.get('origin')
  if (!origin) {
    // Non-browser clients (curl, tests) send no Origin; SameSite still protects browsers.
    next()
    return
  }

  const originHost = hostOf(origin)
  const requestHost = req.get('host')
  const configured = config.allowedOrigins.some((allowed) => hostOf(allowed) === originHost)

  if (originHost && (originHost === requestHost || configured)) {
    next()
    return
  }

  next(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'Cross-origin request rejected.'))
}
