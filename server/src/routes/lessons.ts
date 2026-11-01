import { Router } from 'express'
import { Types } from 'mongoose'
import { CourseModel } from '../models/Course.js'
import { LessonModel } from '../models/Lesson.js'
import { ProgressModel } from '../models/Progress.js'
import { requireDb } from '../middleware/auth.js'
import { notFound, unauthorized } from '../errors.js'
import { routeParam } from '../lib/http.js'

function lessonIdentifier(value: string): Record<string, unknown> {
  if (Types.ObjectId.isValid(value) && value.length === 24) {
    return { $or: [{ slug: value }, { _id: new Types.ObjectId(value) }] }
  }
  return { slug: value }
}

export const lessonsRouter = Router()

lessonsRouter.get('/:lessonId', requireDb, async (req, res) => {
  const lesson = await LessonModel.findOne({
    ...lessonIdentifier(routeParam(req, 'lessonId')),
    status: 'published',
  }).lean()

  if (!lesson) {
    throw notFound('Lesson not found')
  }

  const userId = req.session.userId
  if (!lesson.isPreview && !userId) {
    throw unauthorized('Sign in to read this lesson')
  }

  const [course, siblings, completed] = await Promise.all([
    CourseModel.findOne({ slug: lesson.courseSlug, status: 'published' }).lean(),
    LessonModel.find({ courseSlug: lesson.courseSlug, status: 'published' })
      .select('slug title order')
      .sort({ order: 1 })
      .lean(),
    userId
      ? ProgressModel.findOne({ userId, lessonSlug: lesson.slug }).lean()
      : Promise.resolve(null),
  ])

  if (!course) {
    throw notFound('Course not found')
  }

  const index = siblings.findIndex((item) => item.slug === lesson.slug)
  const previous = index > 0 ? siblings[index - 1] : undefined
  const next = index >= 0 ? siblings[index + 1] : undefined

  res.json({
    lesson: {
      slug: lesson.slug,
      title: lesson.title,
      summary: lesson.summary,
      minutes: lesson.minutes,
      order: lesson.order,
      moduleSlug: lesson.moduleSlug,
      isPreview: lesson.isPreview,
      objectives: lesson.objectives,
      sections: lesson.sections,
      completed: Boolean(completed),
    },
    course: {
      slug: course.slug,
      title: course.title,
      level: course.level,
    },
    moduleTitle:
      course.modules.find((module) => module.slug === lesson.moduleSlug)?.title ?? null,
    navigation: {
      previous: previous ? { slug: previous.slug, title: previous.title } : null,
      next: next ? { slug: next.slug, title: next.title } : null,
    },
    viewer: { authenticated: Boolean(userId) },
  })
})
