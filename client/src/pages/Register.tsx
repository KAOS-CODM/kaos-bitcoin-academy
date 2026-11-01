import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { fieldErrors } from '../lib/api'
import { useMe, useRegister } from '../lib/queries'

export function Register() {
  const { data, isLoading } = useMe()
  const register = useRegister()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') ?? '/dashboard'

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const errors = fieldErrors(register.error)
  const generalError =
    register.isError && Object.keys(errors).length === 0
      ? register.error instanceof Error
        ? register.error.message
        : 'Account creation failed. Please try again.'
      : null

  if (!isLoading && data?.user) {
    return <Navigate to={next} replace />
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    register.mutate(
      { displayName, email, password },
      { onSuccess: () => navigate(next, { replace: true }) },
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold text-parchment">Create your free account</h1>
      <p className="mt-2 text-muted">
        Save your progress across courses. No payment details, ever.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
        <div>
          <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-parchment">
            Display name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="nickname"
            required
            minLength={2}
            maxLength={40}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            aria-invalid={Boolean(errors.displayName)}
            aria-describedby={errors.displayName ? 'displayName-error' : undefined}
            className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-parchment"
            placeholder="How should we address you?"
          />
          {errors.displayName ? (
            <p id="displayName-error" className="mt-1.5 text-sm text-danger">
              {errors.displayName}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-parchment">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-parchment"
            placeholder="you@example.com"
          />
          {errors.email ? (
            <p id="email-error" className="mt-1.5 text-sm text-danger">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-parchment">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : 'password-hint'}
            className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-parchment"
          />
          {errors.password ? (
            <p id="password-error" className="mt-1.5 text-sm text-danger">
              {errors.password}
            </p>
          ) : (
            <p id="password-hint" className="mt-1.5 text-sm text-muted">
              At least 10 characters. A short phrase is easier to remember than a single word.
            </p>
          )}
        </div>

        {generalError ? (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger" role="alert">
            {generalError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={register.isPending}
          className="w-full rounded-md bg-amber px-4 py-2.5 font-semibold text-ink transition hover:bg-amber-soft disabled:opacity-60"
        >
          {register.isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{' '}
        <Link
          to={`/login?next=${encodeURIComponent(next)}`}
          className="font-semibold text-amber hover:text-amber-soft"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
