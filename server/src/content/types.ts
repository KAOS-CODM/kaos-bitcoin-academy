export type SectionType =
  | 'paragraph'
  | 'heading'
  | 'callout'
  | 'example'
  | 'list'
  | 'terms'
  | 'reflection'

export interface Term {
  term: string
  definition: string
}

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

export interface ModuleSeed {
  slug: string
  title: string
  order: number
}

export interface CourseSeed {
  slug: string
  title: string
  description: string
  level: string
  order: number
  estimatedMinutes: number
  modules: ModuleSeed[]
}

export interface LessonSeed {
  slug: string
  courseSlug: string
  moduleSlug: string
  title: string
  summary: string
  order: number
  minutes: number
  objectives: string[]
  sections: LessonSection[]
  isPreview?: boolean
}

export interface CourseBundle {
  course: CourseSeed
  lessons: LessonSeed[]
}

// Authoring helpers: keep lesson source readable and consistent.

export const p = (...paragraphs: string[]): LessonSection => ({
  type: 'paragraph',
  paragraphs,
})

export const h = (heading: string): LessonSection => ({
  type: 'heading',
  heading,
})

export const note = (title: string, ...paragraphs: string[]): LessonSection => ({
  type: 'callout',
  variant: 'note',
  title,
  paragraphs,
})

export const warn = (title: string, ...paragraphs: string[]): LessonSection => ({
  type: 'callout',
  variant: 'warning',
  title,
  paragraphs,
})

export const tip = (title: string, ...paragraphs: string[]): LessonSection => ({
  type: 'callout',
  variant: 'tip',
  title,
  paragraphs,
})

export const example = (title: string, ...paragraphs: string[]): LessonSection => ({
  type: 'example',
  title,
  paragraphs,
})

export const list = (...items: string[]): LessonSection => ({
  type: 'list',
  items,
})

export const terms = (...entries: [string, string][]): LessonSection => ({
  type: 'terms',
  terms: entries.map(([term, definition]) => ({ term, definition })),
})

export const reflect = (prompt: string): LessonSection => ({
  type: 'reflection',
  prompt,
})
