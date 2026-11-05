import { Router } from 'express'
import { CourseModel } from '../models/Course.js'
import { LessonModel } from '../models/Lesson.js'
import { ProgressModel } from '../models/Progress.js'
import { QuizModel } from '../models/Quiz.js'
import { QuizAttemptModel } from '../models/QuizAttempt.js'
import { requireAuth, requireDb } from '../middleware/auth.js'
import { isCourseComplete, summarizeCourse, summarizeOverall } from '../lib/progress.js'
import { getEarnedAchievements, getXpTotal } from '../lib/rewards.js'

export const dashboardRouter = Router()

dashboardRouter.get('/', requireDb, requireAuth, async (req, res) => {
  const userId = req.session.userId as string

  const [courses, lessons, records, assessments, attempts, xpTotal, achievements] =
    await Promise.all([
      CourseModel.find({ status: 'published' }).sort({ order: 1 }).lean(),
      LessonModel.find({ status: 'published' }).select('slug title courseSlug order').lean(),
      ProgressModel.find({ userId }).select('lessonSlug courseSlug completedAt').lean(),
      QuizModel.find({ kind: 'course', status: 'published' })
        .select('slug courseSlug title passingScore questions')
        .lean(),
      QuizAttemptModel.find({ userId })
        .select('quizSlug percent passed completedAt')
        .lean(),
      getXpTotal(userId),
      getEarnedAchievements(userId),
    ])

  const completed = new Set(records.map((record) => record.lessonSlug))
  const lessonsBySlug = new Map(lessons.map((lesson) => [lesson.slug, lesson]))
  const assessmentByCourse = new Map(
    assessments.map((assessment) => [assessment.courseSlug, assessment]),
  )
  const attemptsByQuiz = new Map<string, typeof attempts>()
  for (const attempt of attempts) {
    const list = attemptsByQuiz.get(attempt.quizSlug) ?? []
    list.push(attempt)
    attemptsByQuiz.set(attempt.quizSlug, list)
  }

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
    const assessment = assessmentByCourse.get(course.slug)
    const assessmentAttempts = assessment ? (attemptsByQuiz.get(assessment.slug) ?? []) : []
    const assessmentPassed = assessmentAttempts.some((attempt) => attempt.passed)

    return {
      slug: course.slug,
      title: course.title,
      level: course.level,
      description: course.description,
      estimatedMinutes: course.estimatedMinutes,
      progress: summary,
      complete: isCourseComplete(
        summary.totalLessons,
        summary.completedLessons,
        assessmentPassed,
      ),
      nextLesson: nextLesson
        ? { slug: nextLesson.slug, title: nextLesson.title }
        : null,
      assessment: assessment
        ? {
            slug: assessment.slug,
            title: assessment.title,
            questionCount: assessment.questions.length,
            passingScore: assessment.passingScore,
            requiredForCompletion: true,
            attempts: assessmentAttempts.length,
            bestPercent:
              assessmentAttempts.length > 0
                ? Math.max(...assessmentAttempts.map((attempt) => attempt.percent))
                : 0,
            passed: assessmentPassed,
          }
        : null,
    }
  })

  const overallBase = summarizeOverall(courseSummaries.map((course) => course.progress))
  const overall = {
    ...overallBase,
    coursesComplete: courseSummaries.filter((course) => course.complete).length,
    coursesTotal: courseSummaries.length,
  }
  const nextLessonCourse = courseSummaries.find((course) => course.nextLesson !== null)
  const assessmentResumeCourse = courseSummaries.find(
    (course) =>
      course.nextLesson === null &&
      course.assessment !== null &&
      !course.assessment.passed &&
      !course.complete,
  )
  const resumeCourse = nextLessonCourse ?? assessmentResumeCourse

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
          assessment: resumeCourse.assessment
            ? {
                slug: resumeCourse.assessment.slug,
                title: resumeCourse.assessment.title,
                questionCount: resumeCourse.assessment.questionCount,
                passingScore: resumeCourse.assessment.passingScore,
                passed: resumeCourse.assessment.passed,
              }
            : null,
        }
      : null,
    recent,
    xp: { total: xpTotal },
    achievements,
    isNewLearner: records.length === 0 && attempts.length === 0,
  })
})
