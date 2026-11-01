import { Router } from 'express'
import { CourseModel } from '../models/Course.js'
import { LessonModel } from '../models/Lesson.js'
import { ProgressModel } from '../models/Progress.js'
import { requireAuth, requireDb } from '../middleware/auth.js'
import { summarizeCourse, summarizeOverall } from '../lib/progress.js'

export const dashboardRouter = Router()

dashboardRouter.get('/', requireDb, requireAuth, async (req, res) => {
  const userId = req.session.userId as string

  const [courses, lessons, records] = await Promise.all([
    CourseModel.find({ status: 'published' }).sort({ order: 1 }).lean(),
    LessonModel.find({ status: 'published' }).select('slug title courseSlug order').lean(),
    ProgressModel.find({ userId }).select('lessonSlug courseSlug completedAt').lean(),
  ])

  const completed = new Set(records.map((record) => record.lessonSlug))
  const lessonsBySlug = new Map(lessons.map((lesson) => [lesson.slug, lesson]))

  const courseSummaries = courses.map((course) => {
    const courseLessons = lessons
      .filter((lesson) => lesson.courseSlug === course.slug)
      .sort((a, b) => a.order - b.order)
    const summary = summarizeCourse(
      courseLessons.map((lesson) => lesson.slug),
      completed,
    )
    const nextLesson = summary.nextLessonSlug
      ? lessonsBySlug.get(summary.nextLessonSlug)
      : undefined

    return {
      slug: course.slug,
      title: course.title,
      level: course.level,
      description: course.description,
      estimatedMinutes: course.estimatedMinutes,
      progress: summary,
      nextLesson: nextLesson
        ? { slug: nextLesson.slug, title: nextLesson.title }
        : null,
    }
  })

  const overall = summarizeOverall(courseSummaries.map((course) => course.progress))
  const resumeCourse = courseSummaries.find((course) => course.nextLesson !== null)
  const fallbackCourse = courseSummaries[0]

  const recent = records
    .slice()
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
    .slice(0, 5)
    .map((record) => {
      const lesson = lessonsBySlug.get(record.lessonSlug)
      return {
        lessonSlug: record.lessonSlug,
        lessonTitle: lesson?.title ?? record.lessonSlug,
        courseSlug: record.courseSlug,
        completedAt: record.completedAt,
      }
    })

  res.json({
    courses: courseSummaries,
    overall,
    resume: resumeCourse
      ? {
          courseSlug: resumeCourse.slug,
          courseTitle: resumeCourse.title,
          lesson: resumeCourse.nextLesson,
        }
      : fallbackCourse && fallbackCourse.nextLesson
        ? {
            courseSlug: fallbackCourse.slug,
            courseTitle: fallbackCourse.title,
            lesson: fallbackCourse.nextLesson,
          }
        : null,
    recent,
    isNewLearner: records.length === 0,
  })
})
