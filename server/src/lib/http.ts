import type { Request } from 'express'

/**
 * Express 5 types allow a param to be an array. Routes here always declare a
 * single segment, so normalise defensively instead of casting.
 */
export function routeParam(req: Request, name: string): string {
  const value = (req.params as Record<string, string | string[] | undefined>)[name]
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}
