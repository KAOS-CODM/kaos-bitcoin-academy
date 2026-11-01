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

export interface CourseCard {
  slug: string
  title: string
  description: string
  level: string
  estimatedMinutes: number
  moduleCount: number
  lessonCount: number
  progress: CourseProgress
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
  viewer: { authenticated: boolean }
}

export interface DashboardCourse {
  slug: string
  title: string
  level: string
  description: string
  estimatedMinutes: number
  progress: CourseProgress
  nextLesson: { slug: string; title: string } | null
}

export interface Dashboard {
  courses: DashboardCourse[]
  overall: { totalLessons: number; completedLessons: number; percent: number }
  resume: {
    courseSlug: string
    courseTitle: string
    lesson: { slug: string; title: string }
  } | null
  recent: Array<{
    lessonSlug: string
    lessonTitle: string
    courseSlug: string
    completedAt: string
  }>
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
}
