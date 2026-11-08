import { logger } from '../logger.js'

/**
 * OpenRouter's automatic routing alias is intentional. The academy does not
 * keep a model catalogue, rotate models itself, or pin a particular model.
 */
export const OPENROUTER_MODEL = 'openrouter/auto'
export const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions'

export type TutorMessageRole = 'system' | 'user' | 'assistant'

export interface TutorChatMessage {
  role: TutorMessageRole
  content: string
}

export interface TutorProvider {
  complete(input: {
    apiKey: string
    messages: TutorChatMessage[]
  }): Promise<string>
}

export class TutorProviderError extends Error {
  readonly code = 'AI_UNAVAILABLE'

  constructor(message = 'The AI Tutor is temporarily unavailable. Please try again.') {
    super(message)
    this.name = 'TutorProviderError'
  }
}

type FetchLike = typeof fetch

export function buildOpenRouterRequestBody(messages: TutorChatMessage[]) {
  return {
    model: OPENROUTER_MODEL,
    messages,
    temperature: 0.4,
    max_tokens: 800,
  }
}

function extractAssistantText(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null

  const choices = (payload as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) return null

  const message = (choices[0] as { message?: unknown } | undefined)?.message
  if (typeof message !== 'object' || message === null) return null

  const content = (message as { content?: unknown }).content
  if (typeof content === 'string') {
    const text = content.trim()
    return text === '' ? null : text
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (typeof part !== 'object' || part === null) return ''
        const value = (part as { text?: unknown }).text
        return typeof value === 'string' ? value : ''
      })
      .join('\n')
      .trim()
    return text === '' ? null : text
  }

  return null
}

export function createOpenRouterProvider(fetchImpl: FetchLike = fetch): TutorProvider {
  return {
    async complete({ apiKey, messages }) {
      if (!apiKey.trim()) {
        throw new TutorProviderError()
      }

      let response: Response
      try {
        response = await fetchImpl(OPENROUTER_CHAT_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(buildOpenRouterRequestBody(messages)),
          signal: AbortSignal.timeout(30_000),
        })
      } catch (error) {
        logger.warn({ err: error }, 'OpenRouter request could not be completed')
        throw new TutorProviderError()
      }

      if (!response.ok) {
        // Never forward an upstream body: it can contain provider diagnostics or
        // request details. The status alone is enough for server-side logging.
        logger.warn({ status: response.status }, 'OpenRouter returned a non-success status')
        throw new TutorProviderError()
      }

      let payload: unknown
      try {
        payload = await response.json()
      } catch {
        throw new TutorProviderError()
      }

      const text = extractAssistantText(payload)
      if (!text) {
        throw new TutorProviderError()
      }

      return text
    },
  }
}

export const openRouterTutorProvider = createOpenRouterProvider()
