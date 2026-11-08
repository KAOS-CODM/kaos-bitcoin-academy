import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from './api'
import type {
  CompleteLessonResponse,
  CourseCard,
  CourseDetail,
  Dashboard,
  LessonDetail,
  MeResponse,
  QuizAttemptResponse,
  QuizResponse,
  QuizResultsResponse,
  TutorChatResponse,
  TutorHistoryMessage,
  User,
} from './types'

const shouldNotRetry = (failureCount: number, error: unknown): boolean => {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
  return failureCount < 1
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api<MeResponse>('/auth/me'),
    retry: shouldNotRetry,
    staleTime: 60_000,
  })
}

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => api<{ courses: CourseCard[] }>('/courses'),
    retry: shouldNotRetry,
  })
}

export function useCourse(slug: string | undefined) {
  return useQuery({
    queryKey: ['course', slug],
    queryFn: () => api<CourseDetail>(`/courses/${encodeURIComponent(slug ?? '')}`),
    enabled: Boolean(slug),
    retry: shouldNotRetry,
  })
}

export function useLesson(slug: string | undefined) {
  return useQuery({
    queryKey: ['lesson', slug],
    queryFn: () => api<LessonDetail>(`/lessons/${encodeURIComponent(slug ?? '')}`),
    enabled: Boolean(slug),
    retry: shouldNotRetry,
  })
}

export function useDashboard(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<Dashboard>('/dashboard'),
    enabled,
    retry: shouldNotRetry,
  })
}

export function useQuiz(slug: string | undefined) {
  return useQuery({
    queryKey: ['quiz', slug],
    queryFn: () => api<QuizResponse>(`/quizzes/${encodeURIComponent(slug ?? '')}`),
    enabled: Boolean(slug),
    retry: shouldNotRetry,
  })
}

export function useQuizResults(slug: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['quiz-results', slug],
    queryFn: () => api<QuizResultsResponse>(`/quizzes/${encodeURIComponent(slug ?? '')}/results`),
    enabled: Boolean(slug) && enabled,
    retry: shouldNotRetry,
  })
}

export function useSubmitQuizAttempt(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      attemptKey: string
      answers: Array<{ questionId: string; optionId: string }>
    }) =>
      api<QuizAttemptResponse>(`/quizzes/${encodeURIComponent(slug)}/attempts`, {
        method: 'POST',
        json: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['quiz', slug] })
      void queryClient.invalidateQueries({ queryKey: ['quiz-results', slug] })
      void queryClient.invalidateQueries({ queryKey: ['lesson'] })
      void queryClient.invalidateQueries({ queryKey: ['course'] })
      void queryClient.invalidateQueries({ queryKey: ['courses'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useTutorChat() {
  return useMutation({
    mutationFn: (input: {
      message: string
      lessonSlug?: string
      history: TutorHistoryMessage[]
    }) =>
      api<TutorChatResponse>('/tutor/chat', {
        method: 'POST',
        json: input,
      }),
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api<{ user: User }>('/auth/login', { method: 'POST', json: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries()
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; password: string; displayName: string }) =>
      api<{ user: User }>('/auth/register', { method: 'POST', json: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries()
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData<MeResponse>(['me'], { user: null })
      void queryClient.invalidateQueries()
    },
  })
}

export function useCompleteLesson(lessonSlug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api<CompleteLessonResponse>(
        `/progress/lessons/${encodeURIComponent(lessonSlug)}/complete`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lesson', lessonSlug] })
      void queryClient.invalidateQueries({ queryKey: ['course'] })
      void queryClient.invalidateQueries({ queryKey: ['courses'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
