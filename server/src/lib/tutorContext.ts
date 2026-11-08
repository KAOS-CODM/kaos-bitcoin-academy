import { isDbReady } from '../db.js'
import { notFound, unavailable } from '../errors.js'
import { CourseModel } from '../models/Course.js'
import { LessonModel } from '../models/Lesson.js'
import type { LessonSection } from '../models/Lesson.js'

const MAX_CONTEXT_CHARS = 12_000

export interface TutorContext {
  lessonSlug: string | null
  lessonTitle: string | null
  courseTitle: string | null
  text: string
}

export type TutorContextProvider = (lessonSlug?: string) => Promise<TutorContext>

interface LessonLike {
  title: string
  summary: string
  objectives: string[]
  sections: LessonSection[]
}

function renderSection(section: LessonSection): string {
  const heading = section.heading ?? section.title ?? ''
  const paragraphs = (section.paragraphs ?? []).join('\n')
  const items = (section.items ?? []).map((item) => `- ${item}`).join('\n')
  const terms = (section.terms ?? [])
    .map((term) => `- ${term.term}: ${term.definition}`)
    .join('\n')

  switch (section.type) {
    case 'heading':
      return heading ? `## ${heading}` : ''
    case 'callout':
      return [heading ? `${heading}${section.variant ? ` (${section.variant})` : ''}` : '', paragraphs]
        .filter(Boolean)
        .join('\n')
    case 'example':
      return [heading || 'Example', paragraphs].filter(Boolean).join('\n')
    case 'list':
      return [heading, items].filter(Boolean).join('\n')
    case 'terms':
      return [heading || 'Terms', terms].filter(Boolean).join('\n')
    case 'reflection':
      return [heading || 'Reflection', section.prompt ?? ''].filter(Boolean).join('\n')
    case 'paragraph':
    default:
      return [heading, paragraphs].filter(Boolean).join('\n')
  }
}

export function renderLessonForTutor(lesson: LessonLike): string {
  return [
    `Lesson: ${lesson.title}`,
    `Summary: ${lesson.summary}`,
    lesson.objectives.length > 0 ? `Objectives:\n${lesson.objectives.map((item) => `- ${item}`).join('\n')}` : '',
    ...lesson.sections.map(renderSection),
  ]
    .filter(Boolean)
    .join('\n\n')
}

function limitContext(value: string): string {
  if (value.length <= MAX_CONTEXT_CHARS) return value
  return `${value.slice(0, MAX_CONTEXT_CHARS)}\n\n[Academy context truncated to fit the tutor request.]`
}

/**
 * Builds a compact, curated context pack from published academy content.
 * Full lesson text is only loaded for the lesson the learner is currently
 * reading; otherwise the catalogue summaries provide the grounding.
 */
export const buildTutorContext: TutorContextProvider = async (lessonSlug) => {
  if (!isDbReady()) {
    throw unavailable()
  }

  const [courses, lessonIndex, selectedLesson] = await Promise.all([
    CourseModel.find({ status: 'published' }).sort({ order: 1 }).lean(),
    LessonModel.find({ status: 'published' })
      .select('slug courseSlug title summary order')
      .sort({ courseSlug: 1, order: 1 })
      .lean(),
    lessonSlug
      ? LessonModel.findOne({ slug: lessonSlug, status: 'published' }).lean()
      : Promise.resolve(null),
  ])

  if (lessonSlug && !selectedLesson) {
    throw notFound('Lesson context not found')
  }

  const courseBySlug = new Map(courses.map((course) => [course.slug, course]))
  if (selectedLesson && !courseBySlug.has(selectedLesson.courseSlug)) {
    throw notFound('Lesson context not found')
  }

  const selectedCourse = selectedLesson
    ? courseBySlug.get(selectedLesson.courseSlug)
    : undefined
  const moduleTitle =
    selectedLesson && selectedCourse
      ? selectedCourse.modules.find((module) => module.slug === selectedLesson.moduleSlug)?.title
      : undefined

  const catalogue = courses
    .map((course) => {
      const courseLessons = lessonIndex
        .filter((lesson) => lesson.courseSlug === course.slug)
        .map((lesson) => `  - ${lesson.title} (${lesson.slug}): ${lesson.summary}`)
        .join('\n')
      return [`Course: ${course.title} (${course.slug})`, `  ${course.description}`, courseLessons]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')

  const parts: string[] = []

  if (selectedLesson) {
    parts.push(
      [
        'SELECTED LESSON CONTEXT',
        `Course: ${selectedCourse?.title ?? selectedLesson.courseSlug}`,
        moduleTitle ? `Module: ${moduleTitle}` : '',
        renderLessonForTutor(selectedLesson as LessonLike),
      ]
        .filter(Boolean)
        .join('\n\n'),
    )
  } else {
    parts.push(
      'SELECTED LESSON CONTEXT\nNo specific lesson is selected. Use the catalogue below and general Bitcoin education. Point the learner to a relevant academy lesson when useful.',
    )
  }

  parts.push(`ACADEMY CATALOGUE\n${catalogue}`)

  return {
    lessonSlug: selectedLesson?.slug ?? null,
    lessonTitle: selectedLesson?.title ?? null,
    courseTitle: selectedCourse?.title ?? null,
    text: limitContext(parts.join('\n\n')),
  }
}
