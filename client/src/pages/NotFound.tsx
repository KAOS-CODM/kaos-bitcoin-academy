import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <p className="text-xs uppercase tracking-widest text-amber">404</p>
      <h1 className="mt-2 text-3xl font-semibold text-parchment">That page does not exist</h1>
      <p className="mt-3 text-muted">
        The link may be old or mistyped. The courses are still where you left them.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/courses"
          className="rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink hover:bg-amber-soft"
        >
          Browse courses
        </Link>
        <Link
          to="/"
          className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-parchment hover:border-amber"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
