import { Link, useParams } from 'react-router-dom'
import { QuizRunner } from '../components/Quiz'
import { ApiError } from '../lib/api'
import { useQuiz, useQuizResults } from '../lib/queries'
import type { QuizFeedback, QuizView } from '../lib/types'

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface SavedAttemptFeedbackProps {
  quiz: QuizView
  feedback: QuizFeedback[]
}

function SavedAttemptFeedback({ quiz, feedback }: SavedAttemptFeedbackProps) {
  if (feedback.length === 0) {
    return <p className="mt-3 text-sm text-muted">No saved feedback is available for this attempt.</p>
  }

  const questionById = new Map(quiz.questions.map((question) => [question.id, question]))
  const hasUnavailableContent = feedback.some((item) => {
    const question = questionById.get(item.questionId)
    return (
      !question ||
      !question.options.some((option) => option.id === item.selectedOptionId) ||
      !question.options.some((option) => option.id === item.correctOptionId)
    )
  })

  return (
    <div className="mt-3">
      {hasUnavailableContent ? (
        <p className="rounded-md border border-amber/40 bg-amber/5 p-3 text-sm leading-6 text-muted">
          Some saved questions or answer options are no longer available in the current quiz.
          Those items are marked below.
        </p>
      ) : null}
      <ol className="mt-3 space-y-3">
        {feedback.map((item, index) => {
          const question = questionById.get(item.questionId)
          const selectedOption = question?.options.find(
            (option) => option.id === item.selectedOptionId,
          )
          const correctOption = question?.options.find(
            (option) => option.id === item.correctOptionId,
          )

          return (
            <li
              key={`${item.questionId}-${index}`}
              className="rounded-md border border-line/70 bg-ink/40 p-3 text-sm leading-6"
            >
              <p className="break-words font-medium text-parchment">
                {question
                  ? `${index + 1}. ${question.prompt}`
                  : `${index + 1}. Question no longer available`}
              </p>
              <p className="mt-2 break-words text-muted">
                <span className="font-semibold text-parchment">Your answer:</span>{' '}
                {selectedOption
                  ? selectedOption.text
                  : 'This answer option is no longer available in the current quiz.'}
              </p>
              <p className="mt-1 break-words text-muted">
                <span className="font-semibold text-parchment">Correct answer:</span>{' '}
                {correctOption
                  ? correctOption.text
                  : 'The correct answer option is no longer available in the current quiz.'}
              </p>
              <p className="mt-2">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                    item.correct
                      ? 'border-amber/60 text-amber'
                      : 'border-danger/60 text-danger'
                  }`}
                >
                  {item.correct ? 'Correct' : 'Incorrect'}
                </span>
              </p>
              <p className="mt-2 break-words text-muted">{item.explanation}</p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export function Quiz() {
  const { slug } = useParams<{ slug: string }>()
  const quizQuery = useQuiz(slug)
  const authenticated = quizQuery.data?.viewer.authenticated ?? false
  const resultsQuery = useQuizResults(slug, authenticated)

  if (quizQuery.isPending) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6" role="status">
        <p className="text-muted">Loading quiz…</p>
      </div>
    )
  }

  if (quizQuery.isError || !quizQuery.data) {
    const error = quizQuery.error
    const status = error instanceof ApiError ? error.status : 0
    const signInHref = `/login?next=${encodeURIComponent(`/quizzes/${slug ?? ''}`)}`
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-semibold text-parchment">
          {status === 401
            ? 'Sign in to take this quiz'
            : status === 404
              ? 'Quiz not found'
              : status === 429
                ? 'Too many attempts'
                : 'Quiz temporarily unavailable'}
        </h1>
        <p className="mt-3 leading-7 text-muted">
          {status === 401
            ? 'This quiz belongs to a course. The free preview lesson quiz is open to guests, but you need an account to answer and save attempts.'
            : status === 404
              ? 'The quiz may have moved, or its lesson or course is not published.'
              : status === 429
                ? 'Please wait a few minutes before trying again.'
                : 'The academy could not reach its database. Please try again in a moment.'}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {status === 401 ? (
            <Link
              to={signInHref}
              className="rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink hover:bg-amber-soft"
            >
              Sign in or create an account
            </Link>
          ) : null}
          {status !== 404 ? (
            <button
              type="button"
              onClick={() => void quizQuery.refetch()}
              className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-parchment hover:border-amber"
            >
              Try again
            </button>
          ) : null}
          <Link
            to="/courses"
            className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-parchment hover:border-amber"
          >
            Back to courses
          </Link>
        </div>
      </div>
    )
  }

  const { quiz, attemptSummary } = quizQuery.data

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link to="/courses" className="hover:text-parchment">
          Courses
        </Link>
        <span aria-hidden="true"> / </span>
        <Link to={`/courses/${quiz.courseSlug}`} className="hover:text-parchment">
          Course
        </Link>
        {quiz.lessonSlug ? (
          <>
            <span aria-hidden="true"> / </span>
            <Link to={`/lessons/${quiz.lessonSlug}`} className="hover:text-parchment">
              Lesson
            </Link>
          </>
        ) : null}
        <span aria-hidden="true"> / </span>
        <span className="text-parchment">Quiz</span>
      </nav>

      <div className="mt-6">
        <QuizRunner
          key={quiz.slug}
          quiz={quiz}
          authenticated={quizQuery.data.viewer.authenticated}
          initialSummary={attemptSummary}
        />
      </div>

      {authenticated ? (
        <section aria-labelledby="quiz-results-heading" className="mt-10">
          <h2 id="quiz-results-heading" className="text-xl font-semibold text-parchment">
            Your attempts
          </h2>
          {resultsQuery.isPending ? (
            <p className="mt-3 text-sm text-muted" role="status">
              Loading attempts…
            </p>
          ) : resultsQuery.isError ? (
            <p className="mt-3 text-sm text-muted">
              Attempt history could not be loaded right now.
            </p>
          ) : resultsQuery.data && resultsQuery.data.attempts.length > 0 ? (
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
              {resultsQuery.data.attempts.map((attempt) => (
                <li key={attempt.attemptKey} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-parchment">
                      {attempt.score} / {attempt.total} · {attempt.percent}%
                    </p>
                    <p className={attempt.passed ? 'text-sm font-semibold text-amber' : 'text-sm text-muted'}>
                      {attempt.passed ? 'Passed' : 'Not passed'}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted">{formatDate(attempt.completedAt)}</p>
                  {attempt.feedback.length > 0 ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-semibold text-amber hover:text-amber-soft">
                        Show saved feedback ({attempt.feedback.length}{' '}
                        {attempt.feedback.length === 1 ? 'question' : 'questions'})
                      </summary>
                      <SavedAttemptFeedback quiz={quiz} feedback={attempt.feedback} />
                    </details>
                  ) : (
                    <p className="mt-3 text-sm text-muted">
                      No saved feedback is available for this attempt.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No submitted attempts yet.</p>
          )}
        </section>
      ) : null}
    </div>
  )
}
