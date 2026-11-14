import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { fieldErrors } from '../lib/api'
import { useMe, useRegister } from '../lib/queries'
import { FormField, useFocusFirstError } from '../components/FormField'

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

  useFocusFirstError(errors)

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
        <FormField id="displayName" label="Display name" error={errors.displayName}>
          {(field) => (
            <input
              {...field}
              name="displayName"
              type="text"
              autoComplete="nickname"
              required
              minLength={2}
              maxLength={40}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="How should we address you?"
            />
          )}
        </FormField>

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

        <FormField
          id="password"
          label="Password"
          error={errors.password}
          hint="At least 10 characters. A short phrase is easier to remember than a single word."
        >
          {(field) => (
            <input
              {...field}
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={128}
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
          disabled={register.isPending}
          aria-busy={register.isPending}
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
