export interface User {
  id: string
  email: string
  displayName: string
}

export interface CourseProgress {
  totalLessons: number
  completedLessons: number
  percent: number
  nextLessonSlug: string | null
}

export interface AssessmentSummary {
  slug: string
  title: string
  questionCount: number
  passingScore: number
  requiredForCompletion: boolean
  attempts: number | null
  bestPercent: number | null
  passed: boolean | null
}

export interface CourseCard {
  slug: string
  title: string
  description: string
  level: string
  estimatedMinutes: number
  moduleCount: number
  lessonCount: number
  progress: CourseProgress
  complete: boolean
  assessment: AssessmentSummary | null
}

export interface LessonSummary {
  slug: string
  title: string
  summary: string
  minutes: number
  order: number
  isPreview: boolean
  completed: boolean
}

export interface CourseModule {
  slug: string
  title: string
  order: number
  lessons: LessonSummary[]
}

export interface CourseDetail {
  course: {
    slug: string
    title: string
    description: string
    level: string
    estimatedMinutes: number
  }
  modules: CourseModule[]
  progress: CourseProgress
  complete: boolean
  assessment: AssessmentSummary | null
}

export interface Term {
  term: string
  definition: string
}

export type SectionType =
  | 'paragraph'
  | 'heading'
  | 'callout'
  | 'example'
  | 'list'
  | 'terms'
  | 'reflection'

export interface LessonSection {
  type: SectionType
  heading?: string
  paragraphs?: string[]
  items?: string[]
  terms?: Term[]
  title?: string
  prompt?: string
  variant?: 'note' | 'warning' | 'tip'
}

export interface LessonQuizSummary {
  slug: string
  title: string
  questionCount: number
  passingScore: number
  attempts: number | null
  bestPercent: number | null
  passed: boolean | null
  lastAttemptAt: string | null
}

export interface LessonDetail {
  lesson: {
    slug: string
    title: string
    summary: string
    minutes: number
    order: number
    moduleSlug: string
    isPreview: boolean
    objectives: string[]
    sections: LessonSection[]
    completed: boolean
  }
  course: { slug: string; title: string; level: string }
  moduleTitle: string | null
  navigation: {
    previous: { slug: string; title: string } | null
    next: { slug: string; title: string } | null
  }
  quiz: LessonQuizSummary | null
  viewer: { authenticated: boolean }
}

export interface DashboardCourse {
  slug: string
  title: string
  level: string
  description: string
  estimatedMinutes: number
  progress: CourseProgress
  complete: boolean
  nextLesson: { slug: string; title: string } | null
  assessment: AssessmentSummary | null
}

export interface DashboardAchievement {
  slug: string
  title: string
  description: string
  earnedAt: string
}

export interface Dashboard {
  courses: DashboardCourse[]
  overall: {
    totalLessons: number
    completedLessons: number
    percent: number
    coursesComplete: number
    coursesTotal: number
  }
  resume: {
    courseSlug: string
    courseTitle: string
    lesson: { slug: string; title: string } | null
    assessment: {
      slug: string
      title: string
      questionCount: number
      passingScore: number
      passed: boolean
    } | null
  } | null
  recent: Array<{
    lessonSlug: string
    lessonTitle: string
    courseSlug: string
    completedAt: string
  }>
  xp: { total: number }
  achievements: DashboardAchievement[]
  isNewLearner: boolean
}

export interface MeResponse {
  user: User | null
}

export interface CompleteLessonResponse {
  completed: boolean
  alreadyCompleted: boolean
  lessonSlug: string
  courseSlug: string
  summary: CourseProgress
  complete: boolean
  xpAwarded: number
  totalXp: number
  achievementsAwarded: Array<{ slug: string; title: string }>
}

export interface QuizOption {
  id: string
  text: string
}

export interface QuizQuestion {
  id: string
  prompt: string
  scenario?: string
  options: QuizOption[]
}

export interface QuizView {
  slug: string
  kind: 'lesson' | 'course'
  courseSlug: string
  lessonSlug?: string
  title: string
  passingScore: number
  questionCount: number
  version: number
  questions: QuizQuestion[]
}

export interface QuizAttemptSummary {
  attempts: number
  bestPercent: number
  passed: boolean
  lastAttemptAt: string | null
}

export interface QuizResponse {
  quiz: QuizView
  viewer: { authenticated: boolean }
  attemptSummary: QuizAttemptSummary | null
}

export interface QuizFeedback {
  questionId: string
  selectedOptionId: string
  correctOptionId: string
  correct: boolean
  explanation: string
}

export interface QuizAttemptResponse {
  attemptKey: string
  replayed: boolean
  quizSlug: string
  score: number
  total: number
  percent: number
  passed: boolean
  feedback: QuizFeedback[]
  xpAwarded: number
  totalXp: number
  achievementsAwarded: Array<{ slug: string; title: string }>
}

export interface QuizResultsResponse {
  quizSlug: string
  passed: boolean
  bestPercent: number
  attempts: Array<{
    attemptKey: string
    score: number
    total: number
    percent: number
    passed: boolean
    completedAt: string
    feedback: QuizFeedback[]
  }>
}
