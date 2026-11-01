import { Router } from 'express'
import { Types } from 'mongoose'
import { CourseModel } from '../models/Course.js'
import { LessonModel } from '../models/Lesson.js'
import { ProgressModel } from '../models/Progress.js'
import { requireDb } from '../middleware/auth.js'
import { notFound } from '../errors.js'
import { summarizeCourse } from '../lib/progress.js'
import { routeParam } from '../lib/http.js'

async function completedSlugs(userId: string | undefined): Promise<Set<string>> {
  if (!userId) return new Set()
  const records = await ProgressModel.find({ userId }).select('lessonSlug').lean()
  return new Set(records.map((record) => record.lessonSlug))
}

function courseIdentifier(value: string): Record<string, unknown> {
  if (Types.ObjectId.isValid(value) && value.length === 24) {
    return { $or: [{ slug: value }, { _id: new Types.ObjectId(value) }] }
  }
  return { slug: value }
}

export const coursesRouter = Router()

coursesRouter.get('/', requireDb, async (req, res) => {
  const [courses, lessons, completed] = await Promise.all([
    CourseModel.find({ status: 'published' }).sort({ order: 1 }).lean(),
    LessonModel.find({ status: 'published' })
      .select('slug courseSlug order minutes isPreview')
      .lean(),
    completedSlugs(req.session.userId),
  ])

  const lessonsByCourse = new Map<string, typeof lessons>()
  for (const lesson of lessons) {
    const list = lessonsByCourse.get(lesson.courseSlug) ?? []
    list.push(lesson)
    lessonsByCourse.set(lesson.courseSlug, list)
  }

  res.json({
    courses: courses.map((course) => {
      const courseLessons = (lessonsByCourse.get(course.slug) ?? []).sort(
        (a, b) => a.order - b.order,
      )
      const slugs = courseLessons.map((lesson) => lesson.slug)
      const progress = summarizeCourse(slugs, completed)
      return {
        slug: course.slug,
        title: course.title,
        description: course.description,
        level: course.level,
        estimatedMinutes: course.estimatedMinutes,
        moduleCount: course.modules.length,
        lessonCount: courseLessons.length,
        progress,
      }
    }),
  })
})

coursesRouter.get('/:courseId', requireDb, async (req, res) => {
  const course = await CourseModel.findOne({
    ...courseIdentifier(routeParam(req, 'courseId')),
    status: 'published',
  }).lean()

  if (!course) {
    throw notFound('Course not found')
  }

  const [lessons, completed] = await Promise.all([
    LessonModel.find({ courseSlug: course.slug, status: 'published' }).sort({ order: 1 }).lean(),
    completedSlugs(req.session.userId),
  ])

  const progress = summarizeCourse(
    lessons.map((lesson) => lesson.slug),
    completed,
  )

  const modules = course.modules
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((module) => ({
      slug: module.slug,
      title: module.title,
      order: module.order,
      lessons: lessons
        .filter((lesson) => lesson.moduleSlug === module.slug)
        .map((lesson) => ({
          slug: lesson.slug,
          title: lesson.title,
          summary: lesson.summary,
          minutes: lesson.minutes,
          order: lesson.order,
          isPreview: lesson.isPreview,
          completed: completed.has(lesson.slug),
        })),
    }))

  res.json({
    course: {
      slug: course.slug,
      title: course.title,
      description: course.description,
      level: course.level,
      estimatedMinutes: course.estimatedMinutes,
    },
    modules,
    progress,
  })
})

coursesRouter.get('/:courseId/lessons', requireDb, async (req, res) => {
  const course = await CourseModel.findOne({
    ...courseIdentifier(routeParam(req, 'courseId')),
    status: 'published',
  }).lean()

  if (!course) {
    throw notFound('Course not found')
  }

  const [lessons, completed] = await Promise.all([
    LessonModel.find({ courseSlug: course.slug, status: 'published' })
      .select('slug title summary order minutes moduleSlug isPreview')
      .sort({ order: 1 })
      .lean(),
    completedSlugs(req.session.userId),
  ])

  res.json({
    courseSlug: course.slug,
    lessons: lessons.map((lesson) => ({
      slug: lesson.slug,
      title: lesson.title,
      summary: lesson.summary,
      order: lesson.order,
      minutes: lesson.minutes,
      moduleSlug: lesson.moduleSlug,
      isPreview: lesson.isPreview,
      completed: completed.has(lesson.slug),
    })),
  })
})
