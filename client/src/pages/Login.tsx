import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { fieldErrors } from '../lib/api'
import { useLogin, useMe } from '../lib/queries'
import { FormField, useFocusFirstError } from '../components/FormField'

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

  useFocusFirstError(errors)

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
        <FormField id="email" label="Email address" error={errors.email}>
          {(field) => (
            <input
              {...field}
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          )}
        </FormField>

        <FormField id="password" label="Password" error={errors.password}>
          {(field) => (
            <input
              {...field}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
        </FormField>

        {generalError ? (
          <p
            className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger"
            role="alert"
          >
            {generalError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={login.isPending}
          aria-busy={login.isPending}
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
