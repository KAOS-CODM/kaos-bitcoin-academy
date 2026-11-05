import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { useSubmitQuizAttempt } from '../lib/queries'
import type { QuizAttemptResponse, QuizAttemptSummary, QuizView } from '../lib/types'

interface QuizRunnerProps {
  quiz: QuizView
  authenticated: boolean
  initialSummary?: QuizAttemptSummary | null
  compact?: boolean
  onSubmitted?: () => void
}

function newAttemptKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`
}

export function QuizRunner({
  quiz,
  authenticated,
  initialSummary,
  compact = false,
  onSubmitted,
}: QuizRunnerProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [attemptKey, setAttemptKey] = useState(newAttemptKey)
  const [result, setResult] = useState<QuizAttemptResponse | null>(null)
  const submit = useSubmitQuizAttempt(quiz.slug)
  const resultRef = useRef<HTMLDivElement>(null)

  const allAnswered = quiz.questions.every((question) => Boolean(answers[question.id]))
  const feedbackByQuestion = new Map(
    result?.feedback.map((feedback) => [feedback.questionId, feedback]) ?? [],
  )

  const onSelect = (questionId: string, optionId: string) => {
    setAnswers((current) => ({ ...current, [questionId]: optionId }))
  }

  const onSubmit = () => {
    if (!authenticated || !allAnswered) return
    submit.mutate(
      {
        attemptKey,
        answers: quiz.questions.map((question) => ({
          questionId: question.id,
          optionId: answers[question.id] ?? '',
        })),
      },
      {
        onSuccess: (response) => {
          setResult(response)
          onSubmitted?.()
          requestAnimationFrame(() => resultRef.current?.focus())
        },
        onError: (failure) => {
          // A reused key cannot be retried with different answers. Rotate it so
          // the learner can submit again after reviewing the message.
          if (failure instanceof ApiError && failure.status === 409) {
            setAttemptKey(newAttemptKey())
          }
        },
      },
    )
  }

  const onRetry = () => {
    setAnswers({})
    setResult(null)
    setAttemptKey(newAttemptKey())
    submit.reset()
  }

  const error = submit.error
  const errorStatus = error instanceof ApiError ? error.status : 0
  const errorMessage =
    error instanceof ApiError
      ? error.message
      : 'The attempt could not be submitted. Please try again.'

  return (
    <section
      aria-labelledby={`quiz-${quiz.slug}-heading`}
      className={
        compact
          ? 'mt-10 rounded-lg border border-line bg-surface p-5 sm:p-6'
          : 'rounded-lg border border-line bg-surface p-5 sm:p-6'
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-amber">
            {quiz.kind === 'lesson' ? 'Lesson knowledge check' : 'Course assessment'}
          </p>
          <h2 id={`quiz-${quiz.slug}-heading`} className="mt-1 text-xl font-semibold text-parchment">
            {quiz.title}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {quiz.questionCount} {quiz.questionCount === 1 ? 'question' : 'questions'} ·{' '}
            {quiz.passingScore}% needed to pass
          </p>
        </div>
        {initialSummary ? (
          <p className="rounded-full border border-line px-3 py-1 text-xs text-muted">
            Best: {initialSummary.bestPercent}%
            {initialSummary.passed ? ' · Passed' : ''}
          </p>
        ) : null}
      </div>

      {!authenticated ? (
        <div className="mt-4 rounded-md border border-amber/40 bg-amber/5 p-4">
          <p className="text-sm leading-6 text-muted">
            You can read the preview questions as a guest. Sign in to submit answers, save
            attempts and earn XP.
          </p>
          <Link
            to={`/login?next=${encodeURIComponent(`/quizzes/${quiz.slug}`)}`}
            className="mt-3 inline-block rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink hover:bg-amber-soft"
          >
            Sign in to answer
          </Link>
        </div>
      ) : null}

      <ol className="mt-6 space-y-6">
        {quiz.questions.map((question, questionIndex) => {
          const feedback = feedbackByQuestion.get(question.id)
          return (
            <li key={question.id}>
              <fieldset>
                <legend className="text-base font-medium leading-7 text-parchment">
                  {questionIndex + 1}. {question.prompt}
                </legend>
                {question.scenario ? (
                  <p className="mt-2 rounded-md border border-line/70 bg-ink/40 p-3 text-sm leading-6 text-muted">
                    {question.scenario}
                  </p>
                ) : null}
                <div className="mt-3 space-y-2">
                  {question.options.map((option) => {
                    const selected = answers[question.id] === option.id
                    const isCorrect = feedback?.correctOptionId === option.id
                    const isWrongSelection = Boolean(feedback && selected && !feedback.correct)
                    return (
                      <label
                        key={option.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-sm leading-6 transition ${
                          isCorrect
                            ? 'border-amber/70 bg-amber/10 text-parchment'
                            : isWrongSelection
                              ? 'border-danger/60 bg-danger/10 text-parchment'
                              : selected
                                ? 'border-amber/60 bg-amber/5 text-parchment'
                                : 'border-line text-muted hover:border-amber/50'
                        } ${!authenticated ? 'cursor-default opacity-80' : ''}`}
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={option.id}
                          checked={selected}
                          disabled={!authenticated || Boolean(result)}
                          onChange={() => onSelect(question.id, option.id)}
                          className="mt-1 h-4 w-4 accent-amber"
                        />
                        <span>{option.text}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
              {feedback ? (
                <div className="mt-3 rounded-md border border-line/70 bg-ink/40 p-3 text-sm leading-6">
                  <p className={feedback.correct ? 'font-semibold text-amber' : 'font-semibold text-danger'}>
                    {feedback.correct ? 'Correct' : 'Not quite'}
                  </p>
                  <p className="mt-1 text-muted">{feedback.explanation}</p>
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>

      {error ? (
        <div className="mt-5 rounded-md border border-danger/50 bg-danger/10 p-3 text-sm text-parchment" role="alert">
          <p>{errorMessage}</p>
          {errorStatus === 401 ? (
            <Link
              to={`/login?next=${encodeURIComponent(`/quizzes/${quiz.slug}`)}`}
              className="mt-2 inline-block font-semibold text-amber hover:text-amber-soft"
            >
              Sign in to continue
            </Link>
          ) : null}
        </div>
      ) : null}

      {result ? (
        <div
          ref={resultRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="mt-6 rounded-lg border border-amber/40 bg-amber/5 p-4"
        >
          <h3 className="text-lg font-semibold text-parchment">
            {result.passed ? 'Passed' : 'Not passed yet'}
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            You scored {result.score} of {result.total} ({result.percent}%). The pass mark is{' '}
            {quiz.passingScore}%.
          </p>
          {result.xpAwarded > 0 ? (
            <p className="mt-2 text-sm font-semibold text-amber">
              +{result.xpAwarded} XP earned
            </p>
          ) : null}
          {result.achievementsAwarded.length > 0 ? (
            <p className="mt-1 text-sm text-muted">
              Achievement unlocked: {result.achievementsAwarded.map((item) => item.title).join(', ')}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink hover:bg-amber-soft"
            >
              Try again
            </button>
            {quiz.kind === 'lesson' && quiz.lessonSlug ? (
              <Link
                to={`/lessons/${quiz.lessonSlug}`}
                className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-parchment hover:border-amber"
              >
                Back to lesson
              </Link>
            ) : (
              <Link
                to={`/courses/${quiz.courseSlug}`}
                className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-parchment hover:border-amber"
              >
                Back to course
              </Link>
            )}
          </div>
        </div>
      ) : authenticated ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {allAnswered
              ? 'Ready when you are. Answers are scored on the server.'
              : 'Answer every question before submitting.'}
          </p>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!allAnswered || submit.isPending}
            className="rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-amber-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submit.isPending ? 'Checking…' : 'Submit answers'}
          </button>
        </div>
      ) : null}
    </section>
  )
}
