import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { fieldErrors } from '../lib/api'
import { useLogin, useMe } from '../lib/queries'

export function Login() {
  const { data, isLoading } = useMe()
  const login = useLogin()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const errors = fieldErrors(login.error)
  const generalError =
    login.isError && Object.keys(errors).length === 0
      ? login.error instanceof Error
        ? login.error.message
        : 'Sign in failed. Please try again.'
      : null

  if (!isLoading && data?.user) {
    return <Navigate to={next} replace />
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    login.mutate(
      { email, password },
      {
        onSuccess: () => navigate(next, { replace: true }),
      },
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold text-parchment">Welcome back</h1>
      <p className="mt-2 text-muted">Sign in to continue your progress.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
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
            className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-parchment placeholder:text-muted/60"
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-parchment"
          />
          {errors.password ? (
            <p id="password-error" className="mt-1.5 text-sm text-danger">
              {errors.password}
            </p>
          ) : null}
        </div>

        {generalError ? (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger" role="alert">
            {generalError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={login.isPending}
          className="w-full rounded-md bg-amber px-4 py-2.5 font-semibold text-ink transition hover:bg-amber-soft disabled:opacity-60"
        >
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        New here?{' '}
        <Link
          to={`/register?next=${encodeURIComponent(next)}`}
          className="font-semibold text-amber hover:text-amber-soft"
        >
          Create a free account
        </Link>
      </p>
      <p className="mt-2 text-sm text-muted">
        Or{' '}
        <Link to="/lessons/btc101-what-is-bitcoin" className="text-amber hover:text-amber-soft">
          read the free preview lesson
        </Link>{' '}
        without an account.
      </p>
    </div>
  )
}
