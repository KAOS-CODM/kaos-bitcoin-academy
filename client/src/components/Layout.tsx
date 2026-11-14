import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useLogout, useMe } from '../lib/queries'
import { InstallButton, PwaManager } from './PwaManager'

const navLinkClasses = ({ isActive }: { isActive: boolean }): string =>
  [
    'rounded px-3 py-2 transition',
    isActive
      ? 'bg-surface-2 font-semibold text-parchment'
      : 'text-muted hover:bg-surface-2/60 hover:text-parchment',
  ].join(' ')

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
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <NavLink
            to="/"
            className="flex items-center gap-3 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
          >
            <span
              aria-hidden="true"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-amber font-bold text-ink"
            >
              K
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-wide text-parchment">
                KAOS Bitcoin Academy
              </span>
              <span className="block text-xs text-muted">Free, beginner-first lessons</span>
            </span>
          </NavLink>

          <nav
            aria-label="Main"
            className="-mx-1 flex flex-1 flex-wrap items-center gap-1 overflow-x-auto px-1 text-sm md:justify-end"
          >
            <NavLink to="/courses" className={navLinkClasses}>
              Courses
            </NavLink>
            <NavLink to="/playground" className={navLinkClasses}>
              Playground
            </NavLink>

            {!isLoading && user ? (
              <>
                <NavLink to="/tutor" className={navLinkClasses}>
                  AI Tutor
                </NavLink>
                <NavLink to="/wallet" className={navLinkClasses}>
                  Wallet
                </NavLink>
                <NavLink to="/dashboard" className={navLinkClasses}>
                  Dashboard
                </NavLink>
                <span className="hidden px-2 text-muted sm:inline">{user.displayName}</span>
                <InstallButton />
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
                <NavLink to="/login" className={navLinkClasses}>
                  Sign in
                </NavLink>
                <NavLink
                  to="/register"
                  className={({ isActive }: { isActive: boolean }) =>
                    [
                      'rounded px-3 py-2 font-semibold transition',
                      isActive
                        ? 'bg-amber-soft text-ink'
                        : 'bg-amber text-ink hover:bg-amber-soft',
                    ].join(' ')
                  }
                >
                  Create account
                </NavLink>
              </>
            ) : null}
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1 focus:outline-none">
        <Outlet />
      </main>

      <footer className="border-t border-line/80 px-4 py-8 text-sm text-muted sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>KAOS Bitcoin Academy — free Bitcoin education for beginners.</p>
          <p>No investment advice. Learn at your own pace.</p>
        </div>
      </footer>

      <PwaManager />
    </div>
  )
}
