import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { useLesson, useTutorChat } from '../lib/queries'

interface TutorMessage {
  role: 'user' | 'assistant'
  content: string
}

function tutorErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'AI_DISABLED') {
      return 'The AI Tutor is not enabled on this deployment yet. You can keep learning with the courses and playground.'
    }
    if (error.status === 429) {
      return error.message
    }
    if (error.status === 503) {
      return 'The AI Tutor is temporarily unavailable. Please try again shortly.'
    }
    if (error.status === 401) {
      return 'Your session has expired. Please sign in again.'
    }
    return error.message
  }
  return 'The AI Tutor could not answer right now. Please try again.'
}

export function Tutor() {
  const [searchParams] = useSearchParams()
  const lessonSlug = searchParams.get('lesson') || undefined
  const lessonQuery = useLesson(lessonSlug)
  const chat = useTutorChat()
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [input, setInput] = useState('')

  const lesson = lessonQuery.data?.lesson
  const course = lessonQuery.data?.course
  const contextLabel = lesson
    ? `${course?.title ?? 'Course'} · ${lesson.title}`
    : 'General Bitcoin tutor'

  function send(question: string) {
    const trimmed = question.trim()
    if (!trimmed || chat.isPending) return

    const history = messages.slice(-8).map((message) => ({
      role: message.role,
      content: message.content,
    }))

    setMessages((current) => [...current, { role: 'user', content: trimmed }])
    setInput('')
    chat.mutate(
      { message: trimmed, lessonSlug, history },
      {
        onSuccess: (data) => {
          setMessages((current) => [...current, { role: 'assistant', content: data.reply }])
        },
      },
    )
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    send(input)
  }

  const quickPrompts = lesson
    ? [
        'Explain this lesson in simpler language.',
        'Give me a practical example of the main idea.',
        'Ask me one practice question about this lesson.',
      ]
    : [
        'What is Bitcoin, in simple terms?',
        'How does a blockchain work?',
        'How can I keep a Bitcoin wallet safe?',
      ]

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-amber">KAOS AI Tutor</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-parchment sm:text-4xl">
          Ask about Bitcoin
        </h1>
        <p className="mt-3 text-lg leading-8 text-muted">
          Get beginner-friendly explanations grounded in the academy&apos;s lessons. The tutor can
          make mistakes, so check important ideas against the course material.
        </p>
        <p className="mt-3 inline-block rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
          Context: {contextLabel}
        </p>
        {lessonSlug && lessonQuery.isError ? (
          <p className="mt-2 text-sm text-muted">
            That lesson context is unavailable, so the tutor will answer generally.
          </p>
        ) : null}
      </header>

      <div className="mt-6 rounded-lg border border-amber/40 bg-amber/5 p-4 text-sm leading-6 text-muted">
        <p className="font-semibold text-amber">Educational help, not financial advice.</p>
        <p className="mt-1">
          Never share a seed phrase, private key, password, or other secret with the tutor or anyone
          else. Ask questions about how Bitcoin works, not what to buy or sell.
        </p>
      </div>

      <section aria-labelledby="tutor-conversation" className="mt-8">
        <h2 id="tutor-conversation" className="sr-only">
          Conversation with the AI Tutor
        </h2>

        {messages.length === 0 ? (
          <div className="rounded-lg border border-line bg-surface p-5">
            <p className="text-sm leading-7 text-muted">
              Ask a question about Bitcoin, or choose a starting point:
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  disabled={chat.isPending}
                  className="rounded-md border border-line px-4 py-3 text-left text-sm text-parchment transition hover:border-amber disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-busy={chat.isPending}
            className="space-y-4"
          >
            {messages.map((message, index) => (
              <li
                key={`${message.role}-${index}`}
                className={
                  message.role === 'user'
                    ? 'ml-auto max-w-[90%] rounded-lg border border-amber/40 bg-amber/10 p-4'
                    : 'mr-auto max-w-[95%] rounded-lg border border-line bg-surface p-4'
                }
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                  {message.role === 'user' ? 'You' : 'Tutor'}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-parchment">
                  {message.content}
                </p>
              </li>
            ))}
            {chat.isPending ? (
              <li className="mr-auto rounded-lg border border-line bg-surface p-4" role="status">
                <p className="text-sm text-muted">Thinking…</p>
              </li>
            ) : null}
          </ol>
        )}
      </section>

      {chat.isError ? (
        <div className="mt-5 rounded-lg border border-danger/50 bg-danger/10 p-4" role="alert">
          <p className="text-sm leading-6 text-parchment">{tutorErrorMessage(chat.error)}</p>
          <button
            type="button"
            onClick={() => chat.reset()}
            className="mt-3 rounded border border-line px-3 py-2 text-sm text-parchment hover:border-amber"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 rounded-lg border border-line bg-surface p-4">
        <label htmlFor="tutor-message" className="text-sm font-semibold text-parchment">
          Your question
        </label>
        <textarea
          id="tutor-message"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="e.g. Why does Bitcoin use proof of work?"
          className="mt-2 w-full resize-y rounded-md border border-line bg-ink px-3 py-2 text-sm leading-6 text-parchment placeholder:text-muted/70"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">{input.length}/1000 characters</p>
          <button
            type="submit"
            disabled={chat.isPending || input.trim() === ''}
            className="rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-amber-soft disabled:opacity-60"
          >
            {chat.isPending ? 'Sending…' : 'Ask the tutor'}
          </button>
        </div>
      </form>

      <p className="mt-4 text-xs leading-5 text-muted">
        The tutor keeps the current conversation only in this browser session. Closing or refreshing
        the page starts a new conversation.
      </p>

      <nav aria-label="Tutor navigation" className="mt-8 flex flex-wrap gap-3">
        {lessonSlug ? (
          <Link
            to={`/lessons/${lessonSlug}`}
            className="rounded-md border border-line px-4 py-2.5 text-sm text-parchment hover:border-amber"
          >
            ← Back to the lesson
          </Link>
        ) : null}
        <Link
          to="/courses"
          className="rounded-md border border-line px-4 py-2.5 text-sm text-parchment hover:border-amber"
        >
          Browse courses
        </Link>
        <Link
          to="/playground"
          className="rounded-md border border-line px-4 py-2.5 text-sm text-parchment hover:border-amber"
        >
          Open the playground
        </Link>
      </nav>
    </div>
  )
}
