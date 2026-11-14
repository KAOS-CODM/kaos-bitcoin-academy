export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

interface ErrorPayload {
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}

/**
 * The API origin.
 *
 * The academy is served from one origin, so the default is a relative path. A split
 * deployment can point the client at another origin with `VITE_API_BASE_URL`. The value is
 * baked into the build, so it must never contain a secret.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

/** How long a single API request may take before it is abandoned. */
export const API_TIMEOUT_MS = 20_000

export async function api<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = options
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api${path}`, {
      credentials: 'include',
      ...rest,
      signal: rest.signal ?? controller.signal,
      headers: {
        ...(json === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: json === undefined ? undefined : JSON.stringify(json),
    })
  } catch {
    if (controller.signal.aborted) {
      throw new ApiError(
        0,
        'REQUEST_TIMEOUT',
        'The academy took too long to answer. Check your connection and try again.',
      )
    }
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'The academy could not be reached. Check your connection and try again.',
    )
  } finally {
    clearTimeout(timeout)
  }

  if (response.status === 204) {
    return undefined as T
  }

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const error = (payload as ErrorPayload | null)?.error
    throw new ApiError(
      response.status,
      error?.code ?? 'REQUEST_FAILED',
      error?.message ?? 'Something went wrong. Please try again.',
      error?.details,
    )
  }

  return payload as T
}

export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {}
  const details = error.details as { fields?: Array<{ path?: string; message?: string }> } | undefined
  const result: Record<string, string> = {}
  for (const field of details?.fields ?? []) {
    if (field.path && field.message && !result[field.path]) {
      result[field.path] = field.message
    }
  }
  return result
}
