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

export async function api<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = options
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    ...rest,
    headers: {
      ...(json === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: json === undefined ? undefined : JSON.stringify(json),
  })

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
