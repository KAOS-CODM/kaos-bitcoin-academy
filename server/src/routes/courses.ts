import { Router } from 'express'
import { Types } from 'mongoose'
import { CourseModel } from '../models/Course.js'
import { LessonModel } from '../models/Lesson.js'
import { ProgressModel } from '../models/Progress.js'
import { QuizModel } from '../models/Quiz.js'
import { QuizAttemptModel } from '../models/QuizAttempt.js'
import { requireDb } from '../middleware/auth.js'
import { notFound } from '../errors.js'
import { isCourseComplete, summarizeCourse } from '../lib/progress.js'
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

interface AttemptStat {
  quizSlug: string
  percent: number
  passed: boolean
}

function attemptsByQuiz(attempts: AttemptStat[]): Map<string, AttemptStat[]> {
  const map = new Map<string, AttemptStat[]>()
  for (const attempt of attempts) {
    const list = map.get(attempt.quizSlug) ?? []
    list.push(attempt)
    map.set(attempt.quizSlug, list)
  }
  return map
}

function assessmentDto(
  assessment:
    | {
        slug: string
        title: string
        passingScore: number
        questions: unknown[]
      }
    | undefined,
  attempts: AttemptStat[] | null,
) {
  if (!assessment) return null
  const learnerAttempts = attempts ?? []
  return {
    slug: assessment.slug,
    title: assessment.title,
    questionCount: assessment.questions.length,
    passingScore: assessment.passingScore,
    requiredForCompletion: true,
    attempts: attempts ? learnerAttempts.length : null,
    bestPercent:
      attempts && learnerAttempts.length > 0
        ? Math.max(...learnerAttempts.map((attempt) => attempt.percent))
        : attempts
          ? 0
          : null,
    passed: attempts ? learnerAttempts.some((attempt) => attempt.passed) : null,
  }
}

export const coursesRouter = Router()

coursesRouter.get('/', requireDb, async (req, res) => {
  const userId = req.session.userId
  const [courses, lessons, completed, assessments, attempts] = await Promise.all([
    CourseModel.find({ status: 'published' }).sort({ order: 1 }).lean(),
    LessonModel.find({ status: 'published' })
      .select('slug courseSlug order minutes isPreview')
      .lean(),
    completedSlugs(userId),
    QuizModel.find({ kind: 'course', status: 'published' })
      .select('slug courseSlug title passingScore questions')
      .lean(),
    userId
      ? QuizAttemptModel.find({ userId }).select('quizSlug percent passed').lean()
      : Promise.resolve([]),
  ])

  const lessonsByCourse = new Map<string, typeof lessons>()
  for (const lesson of lessons) {
    const list = lessonsByCourse.get(lesson.courseSlug) ?? []
    list.push(lesson)
    lessonsByCourse.set(lesson.courseSlug, list)
  }

  const assessmentByCourse = new Map(assessments.map((assessment) => [assessment.courseSlug, assessment]))
  const attemptsMap = attemptsByQuiz(attempts)

  res.json({
    courses: courses.map((course) => {
      const courseLessons = (lessonsByCourse.get(course.slug) ?? []).sort(
        (a, b) => a.order - b.order,
      )
      const slugs = courseLessons.map((lesson) => lesson.slug)
      const progress = summarizeCourse(slugs, completed)
      const assessment = assessmentByCourse.get(course.slug)
      const assessmentAttempts = assessment
        ? userId
          ? (attemptsMap.get(assessment.slug) ?? [])
          : null
        : null
      const assessmentPassed = Boolean(
        assessmentAttempts?.some((attempt) => attempt.passed),
      )
      return {
        slug: course.slug,
        title: course.title,
        description: course.description,
        level: course.level,
        estimatedMinutes: course.estimatedMinutes,
        moduleCount: course.modules.length,
        lessonCount: courseLessons.length,
        progress,
        complete: isCourseComplete(
          progress.totalLessons,
          progress.completedLessons,
          assessmentPassed,
        ),
        assessment: assessmentDto(assessment, assessmentAttempts),
      }
    }),
  })
})

coursesRouter.get('/:courseId', requireDb, async (req, res) => {
  const userId = req.session.userId
  const course = await CourseModel.findOne({
    ...courseIdentifier(routeParam(req, 'courseId')),
    status: 'published',
  }).lean()

  if (!course) {
    throw notFound('Course not found')
  }

  const [lessons, completed, assessment, attempts] = await Promise.all([
    LessonModel.find({ courseSlug: course.slug, status: 'published' }).sort({ order: 1 }).lean(),
    completedSlugs(userId),
    QuizModel.findOne({ courseSlug: course.slug, kind: 'course', status: 'published' })
      .select('slug title passingScore questions')
      .lean(),
    userId && course.slug
      ? QuizAttemptModel.find({ userId, courseSlug: course.slug })
          .select('quizSlug percent passed')
          .lean()
      : Promise.resolve([]),
  ])

  const progress = summarizeCourse(
    lessons.map((lesson) => lesson.slug),
    completed,
  )
  const assessmentAttempts = assessment
    ? attempts.filter((attempt) => attempt.quizSlug === assessment.slug)
    : []
  const assessmentPassed = assessmentAttempts.some((attempt) => attempt.passed)

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
    complete: isCourseComplete(
      progress.totalLessons,
      progress.completedLessons,
      assessmentPassed,
    ),
    assessment: assessmentDto(
      assessment ?? undefined,
      userId ? assessmentAttempts : null,
    ),
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
