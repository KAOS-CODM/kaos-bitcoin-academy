import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useMe } from '../lib/queries'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data, isLoading } = useMe()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6" role="status">
        <p className="text-muted">Checking your session…</p>
      </div>
    )
  }

  if (!data?.user) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }

  return <>{children}</>
}
