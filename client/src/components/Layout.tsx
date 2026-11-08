import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useLogout, useMe } from '../lib/queries'

export function Layout() {
  const { data, isLoading } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()
  const user = data?.user ?? null

  const onSignOut = () => {
    logout.mutate(undefined, {
      onSettled: () => navigate('/'),
    })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only rounded bg-amber px-4 py-2 text-ink focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>

      <header className="border-b border-line/80 bg-ink/95">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-md bg-amber font-bold text-ink"
            >
              K
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-wide text-parchment">
                KAOS Bitcoin Academy
              </span>
              <span className="block text-xs text-muted">Free, beginner-first lessons</span>
            </span>
          </Link>

          <nav aria-label="Main" className="flex items-center gap-2 text-sm">
            <Link
              to="/courses"
              className="rounded px-3 py-2 text-muted transition hover:text-parchment"
            >
              Courses
            </Link>
            <Link
              to="/playground"
              className="rounded px-3 py-2 text-muted transition hover:text-parchment"
            >
              Playground
            </Link>

            {!isLoading && user ? (
              <>
                <Link
                  to="/tutor"
                  className="rounded px-3 py-2 text-muted transition hover:text-parchment"
                >
                  AI Tutor
                </Link>
                <Link
                  to="/dashboard"
                  className="rounded px-3 py-2 text-muted transition hover:text-parchment"
                >
                  Dashboard
                </Link>
                <span className="hidden text-muted sm:inline">{user.displayName}</span>
                <button
                  type="button"
                  onClick={onSignOut}
                  disabled={logout.isPending}
                  className="rounded border border-line px-3 py-2 text-muted transition hover:border-amber hover:text-parchment disabled:opacity-60"
                >
                  Sign out
                </button>
              </>
            ) : null}

            {!isLoading && !user ? (
              <>
                <Link
                  to="/login"
                  className="rounded px-3 py-2 text-muted transition hover:text-parchment"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="rounded bg-amber px-3 py-2 font-semibold text-ink transition hover:bg-amber-soft"
                >
                  Create account
                </Link>
              </>
            ) : null}
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line/80 px-4 py-8 text-sm text-muted sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>KAOS Bitcoin Academy — free Bitcoin education for beginners.</p>
          <p>No investment advice. Learn at your own pace.</p>
        </div>
      </footer>
    </div>
  )
}
