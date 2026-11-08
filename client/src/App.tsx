import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Home } from './pages/Home'
import { Catalogue } from './pages/Catalogue'
import { CourseDetail } from './pages/CourseDetail'
import { Lesson } from './pages/Lesson'
import { Quiz } from './pages/Quiz'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { Playground } from './pages/Playground'
import { PlaygroundSimulation } from './pages/PlaygroundSimulation'
import { Tutor } from './pages/Tutor'
import { NotFound } from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
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
    </Routes>
  )
}
