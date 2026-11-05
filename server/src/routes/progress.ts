import { Router } from 'express'
import { Types } from 'mongoose'
import { CourseModel } from '../models/Course.js'
import { LessonModel } from '../models/Lesson.js'
import { ProgressModel } from '../models/Progress.js'
import { QuizModel } from '../models/Quiz.js'
import { QuizAttemptModel } from '../models/QuizAttempt.js'
import { requireAuth, requireDb } from '../middleware/auth.js'
import { notFound } from '../errors.js'
import { isCourseComplete, summarizeCourse } from '../lib/progress.js'
import { evaluateCourseCompletion } from '../lib/rewards.js'
import { logger } from '../logger.js'
import { routeParam } from '../lib/http.js'

function courseIdentifier(value: string): Record<string, unknown> {
  if (Types.ObjectId.isValid(value) && value.length === 24) {
    return { $or: [{ slug: value }, { _id: new Types.ObjectId(value) }] }
  }
  return { slug: value }
}

function lessonIdentifier(value: string): Record<string, unknown> {
  if (Types.ObjectId.isValid(value) && value.length === 24) {
    return { $or: [{ slug: value }, { _id: new Types.ObjectId(value) }] }
  }
  return { slug: value }
}

export const progressRouter = Router()

progressRouter.get('/', requireDb, requireAuth, async (req, res) => {
  const records = await ProgressModel.find({ userId: req.session.userId })
    .sort({ completedAt: -1 })
    .lean()

  res.json({
    progress: records.map((record) => ({
      lessonSlug: record.lessonSlug,
      courseSlug: record.courseSlug,
      completedAt: record.completedAt,
    })),
  })
})

progressRouter.get('/:courseId', requireDb, requireAuth, async (req, res) => {
  const course = await CourseModel.findOne({
    ...courseIdentifier(routeParam(req, 'courseId')),
    status: 'published',
  }).lean()

  if (!course) {
    throw notFound('Course not found')
  }

  // Ownership is enforced by the session-scoped userId filter, never by a client id.
  const [lessons, records, assessment] = await Promise.all([
    LessonModel.find({ courseSlug: course.slug, status: 'published' })
      .select('slug order')
      .sort({ order: 1 })
      .lean(),
    ProgressModel.find({ userId: req.session.userId, courseSlug: course.slug })
      .select('lessonSlug completedAt')
      .lean(),
    QuizModel.findOne({ courseSlug: course.slug, kind: 'course', status: 'published' })
      .select('slug title passingScore questions')
      .lean(),
  ])

  const completed = new Set(records.map((record) => record.lessonSlug))
  const summary = summarizeCourse(
    lessons.map((lesson) => lesson.slug),
    completed,
  )
  const assessmentPassed = assessment
    ? Boolean(
        await QuizAttemptModel.exists({
          userId: req.session.userId,
          quizId: assessment._id,
          passed: true,
        }),
      )
    : false

  res.json({
    courseSlug: course.slug,
    summary,
    complete: isCourseComplete(summary.totalLessons, summary.completedLessons, assessmentPassed),
    assessment: assessment
      ? {
          slug: assessment.slug,
          title: assessment.title,
          questionCount: assessment.questions.length,
          passingScore: assessment.passingScore,
          passed: assessmentPassed,
          requiredForCompletion: true,
        }
      : null,
    completedLessons: records.map((record) => ({
      lessonSlug: record.lessonSlug,
      completedAt: record.completedAt,
    })),
  })
})

progressRouter.post('/lessons/:lessonId/complete', requireDb, requireAuth, async (req, res) => {
  const lesson = await LessonModel.findOne({
    ...lessonIdentifier(routeParam(req, 'lessonId')),
    status: 'published',
  }).lean()

  if (!lesson) {
    throw notFound('Lesson not found')
  }

  const userId = req.session.userId as string
  const existing = await ProgressModel.findOne({ userId, lessonSlug: lesson.slug }).lean()

  if (!existing) {
    try {
      await ProgressModel.updateOne(
        { userId, lessonSlug: lesson.slug },
        {
          $setOnInsert: {
            userId,
            lessonSlug: lesson.slug,
            courseSlug: lesson.courseSlug,
            completedAt: new Date(),
          },
        },
        { upsert: true },
      )
    } catch (error) {
      // A concurrent double-submit can lose the upsert race on the unique index.
      // The record exists either way, so treat it as already completed.
      const duplicate =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: unknown }).code === 11000
      if (!duplicate) throw error
    }
  }

  const [lessons, records] = await Promise.all([
    LessonModel.find({ courseSlug: lesson.courseSlug, status: 'published' })
      .select('slug order')
      .sort({ order: 1 })
      .lean(),
    ProgressModel.find({ userId, courseSlug: lesson.courseSlug }).select('lessonSlug').lean(),
  ])

  const summary = summarizeCourse(
    lessons.map((item) => item.slug),
    new Set(records.map((record) => record.lessonSlug)),
  )

  let completion = {
    complete: false,
    xpAwarded: 0,
    totalXp: 0,
    achievementsAwarded: [] as Array<{ slug: string; title: string }>,
  }
  try {
    // The progress write above has committed. The assessment route also
    // reconciles after its transaction commits, so at least one post-commit
    // evaluation observes both the final lesson and the passed assessment.
    completion = await evaluateCourseCompletion(userId, lesson.courseSlug)
  } catch (error) {
    // Lesson completion must remain valid even if reward bookkeeping is briefly
    // unavailable; the unique reward keys let a later evaluation catch up safely.
    logger.error({ err: error, userId, courseSlug: lesson.courseSlug }, 'course completion evaluation failed')
  }

  res.status(existing ? 200 : 201).json({
    completed: true,
    alreadyCompleted: Boolean(existing),
    lessonSlug: lesson.slug,
    courseSlug: lesson.courseSlug,
    summary,
    complete: completion.complete,
    xpAwarded: completion.xpAwarded,
    totalXp: completion.totalXp,
    achievementsAwarded: completion.achievementsAwarded,
  })
})
