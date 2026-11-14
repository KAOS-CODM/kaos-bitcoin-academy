import { Suspense, lazy } from 'react'
import { Outlet, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'

/**
 * Every page except the landing page and the not-found page is loaded on demand.
 *
 * This keeps the initial download small: the wallet practice carries the NWC SDK,
 * `nostr-tools`, and the BOLT 11 decoder, and those are fetched only when a learner opens
 * the wallet page. The playground simulations and the AI Tutor are split the same way.
 */
const Catalogue = lazy(() =>
  import('./pages/Catalogue').then((module) => ({ default: module.Catalogue })),
)
const CourseDetail = lazy(() =>
  import('./pages/CourseDetail').then((module) => ({ default: module.CourseDetail })),
)
const Lesson = lazy(() =>
  import('./pages/Lesson').then((module) => ({ default: module.Lesson })),
)
const Quiz = lazy(() => import('./pages/Quiz').then((module) => ({ default: module.Quiz })))
const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })))
const Register = lazy(() =>
  import('./pages/Register').then((module) => ({ default: module.Register })),
)
const Dashboard = lazy(() =>
  import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })),
)
const Playground = lazy(() =>
  import('./pages/Playground').then((module) => ({ default: module.Playground })),
)
const PlaygroundSimulation = lazy(() =>
  import('./pages/PlaygroundSimulation').then((module) => ({
    default: module.PlaygroundSimulation,
  })),
)
const Tutor = lazy(() => import('./pages/Tutor').then((module) => ({ default: module.Tutor })))
const Wallet = lazy(() => import('./pages/Wallet').then((module) => ({ default: module.Wallet })))

/**
 * The fallback shown while a route chunk is downloading.
 *
 * It announces itself to assistive technology and reserves a stable height so the page does
 * not jump when the real page arrives. The animation is removed when the learner has asked
 * for reduced motion.
 */
function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center gap-3 px-4 py-16 text-center sm:px-6"
    >
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-amber motion-reduce:animate-none"
      />
      <p className="text-sm text-muted">Loading this page…</p>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route
          element={
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          }
        >
          <Route index element={<Home />} />
          <Route path="courses" element={<Catalogue />} />
          <Route path="courses/:slug" element={<CourseDetail />} />
          <Route path="lessons/:slug" element={<Lesson />} />
          <Route path="quizzes/:slug" element={<Quiz />} />
          <Route path="playground" element={<Playground />} />
          <Route path="playground/:simulationId" element={<PlaygroundSimulation />} />
          <Route
            path="tutor"
            element={
              <ProtectedRoute>
                <Tutor />
              </ProtectedRoute>
            }
          />
          <Route
            path="wallet"
            element={
              <ProtectedRoute>
                <Wallet />
              </ProtectedRoute>
            }
          />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  )
}
