import { Types } from 'mongoose'
import type { ClientSession } from 'mongoose'
import { CourseModel } from '../models/Course.js'
import { LessonModel } from '../models/Lesson.js'
import { ProgressModel } from '../models/Progress.js'
import { QuizModel } from '../models/Quiz.js'
import { QuizAttemptModel } from '../models/QuizAttempt.js'
import { XpEventModel } from '../models/XpEvent.js'
import { AchievementModel } from '../models/Achievement.js'
import { UserAchievementModel } from '../models/UserAchievement.js'
import { isCourseComplete } from './progress.js'
import type { QuizDefinition } from './quiz.js'

export const XP_AMOUNTS = {
  lessonCheckPass: 10,
  courseAssessmentPass: 25,
  courseComplete: 50,
} as const

export const ACHIEVEMENT_TITLES: Record<string, string> = {
  'first-check': 'First Check',
  'first-assessment': 'Assessment Passed',
  'first-course': 'Course Finisher',
}

export interface AwardedAchievement {
  slug: string
  title: string
}

export interface RewardSummary {
  xpAwarded: number
  totalXp: number
  achievementsAwarded: AwardedAchievement[]
}

export interface CompletionReward extends RewardSummary {
  complete: boolean
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  )
}

export async function awardXp(
  userId: string,
  eventKey: string,
  amount: number,
  source: 'lesson_check_pass' | 'course_assessment_pass' | 'course_complete',
  sourceId: string,
  session?: ClientSession,
): Promise<boolean> {
  try {
    const result = await XpEventModel.updateOne(
      { userId, eventKey },
      {
        $setOnInsert: {
          userId,
          eventKey,
          amount,
          source,
          sourceId,
          createdAt: new Date(),
        },
      },
      { upsert: true, session },
    )
    return result.upsertedCount === 1
  } catch (error) {
    // Inside a transaction a duplicate key aborts the transaction. Let the
    // caller retry so it can observe the existing event; swallowing the error
    // would leave the session unusable for the remaining writes.
    if (!session && isDuplicateKey(error)) return false
    throw error
  }
}

export async function awardAchievement(
  userId: string,
  achievementSlug: string,
  session?: ClientSession,
): Promise<boolean> {
  try {
    const result = await UserAchievementModel.updateOne(
      { userId, achievementSlug },
      {
        $setOnInsert: {
          userId,
          achievementSlug,
          earnedAt: new Date(),
        },
      },
      { upsert: true, session },
    )
    return result.upsertedCount === 1
  } catch (error) {
    if (!session && isDuplicateKey(error)) return false
    throw error
  }
}

export async function getXpTotal(userId: string, session?: ClientSession): Promise<number> {
  const aggregate = XpEventModel.aggregate<{ total: number }>([
    { $match: { userId: new Types.ObjectId(userId) } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  if (session) aggregate.session(session)
  const rows = await aggregate.exec()
  return rows[0]?.total ?? 0
}

export async function getEarnedAchievements(
  userId: string,
): Promise<Array<{ slug: string; title: string; description: string; earnedAt: Date }>> {
  const awards = await UserAchievementModel.find({ userId }).sort({ earnedAt: -1 }).lean()
  if (awards.length === 0) return []

  const definitions = await AchievementModel.find({
    slug: { $in: awards.map((award) => award.achievementSlug) },
  }).lean()
  const bySlug = new Map(definitions.map((definition) => [definition.slug, definition]))

  return awards.flatMap((award) => {
    const definition = bySlug.get(award.achievementSlug)
    if (!definition) return []
    return [
      {
        slug: definition.slug,
        title: definition.title,
        description: definition.description,
        earnedAt: award.earnedAt,
      },
    ]
  })
}

export async function evaluateCourseCompletion(
  userId: string,
  courseSlug: string,
  session?: ClientSession,
): Promise<CompletionReward> {
  const courseQuery = CourseModel.findOne({ slug: courseSlug, status: 'published' })
  if (session) courseQuery.session(session)
  const course = await courseQuery.lean()
  if (!course) {
    return { complete: false, xpAwarded: 0, totalXp: await getXpTotal(userId, session), achievementsAwarded: [] }
  }

  const lessonsQuery = LessonModel.find({ courseSlug, status: 'published' }).select('slug')
  if (session) lessonsQuery.session(session)
  const lessons = await lessonsQuery.lean()
  const lessonSlugs = lessons.map((lesson) => lesson.slug)

  const progressQuery = ProgressModel.countDocuments({
    userId,
    courseSlug,
    lessonSlug: { $in: lessonSlugs },
  })
  if (session) progressQuery.session(session)
  const completedLessons = await progressQuery

  const assessmentQuery = QuizModel.findOne({
    courseSlug,
    kind: 'course',
    status: 'published',
  }).select('_id')
  if (session) assessmentQuery.session(session)
  const assessment = await assessmentQuery.lean()

  let assessmentPassed = false
  if (assessment) {
    const attemptQuery = QuizAttemptModel.exists({
      userId,
      quizId: assessment._id,
      passed: true,
    })
    if (session) attemptQuery.session(session)
    assessmentPassed = Boolean(await attemptQuery)
  }

  const complete = isCourseComplete(lessonSlugs.length, completedLessons, assessmentPassed)
  if (!complete) {
    return {
      complete: false,
      xpAwarded: 0,
      totalXp: await getXpTotal(userId, session),
      achievementsAwarded: [],
    }
  }

  let xpAwarded = 0
  const achievementsAwarded: AwardedAchievement[] = []

  if (
    await awardXp(
      userId,
      `course-complete:${courseSlug}`,
      XP_AMOUNTS.courseComplete,
      'course_complete',
      courseSlug,
      session,
    )
  ) {
    xpAwarded += XP_AMOUNTS.courseComplete
  }

  if (await awardAchievement(userId, 'first-course', session)) {
    achievementsAwarded.push({ slug: 'first-course', title: ACHIEVEMENT_TITLES['first-course'] })
  }

  return {
    complete: true,
    xpAwarded,
    totalXp: await getXpTotal(userId, session),
    achievementsAwarded,
  }
}

export async function awardQuizPassRewards(
  userId: string,
  quiz: QuizDefinition,
  session?: ClientSession,
): Promise<RewardSummary> {
  let xpAwarded = 0
  const achievementsAwarded: AwardedAchievement[] = []

  if (quiz.kind === 'lesson') {
    if (
      await awardXp(
        userId,
        `lesson-check-pass:${quiz.slug}`,
        XP_AMOUNTS.lessonCheckPass,
        'lesson_check_pass',
        quiz.slug,
        session,
      )
    ) {
      xpAwarded += XP_AMOUNTS.lessonCheckPass
    }
    if (await awardAchievement(userId, 'first-check', session)) {
      achievementsAwarded.push({ slug: 'first-check', title: ACHIEVEMENT_TITLES['first-check'] })
    }
  } else {
    if (
      await awardXp(
        userId,
        `course-assessment-pass:${quiz.slug}`,
        XP_AMOUNTS.courseAssessmentPass,
        'course_assessment_pass',
        quiz.slug,
        session,
      )
    ) {
      xpAwarded += XP_AMOUNTS.courseAssessmentPass
    }
    if (await awardAchievement(userId, 'first-assessment', session)) {
      achievementsAwarded.push({
        slug: 'first-assessment',
        title: ACHIEVEMENT_TITLES['first-assessment'],
      })
    }

    // Opportunistic in-transaction evaluation. The attempt route also calls
    // evaluateCourseCompletion after this transaction commits; that post-commit
    // pass is what closes the final-lesson/assessment race.
    const completion = await evaluateCourseCompletion(userId, quiz.courseSlug, session)
    xpAwarded += completion.xpAwarded
    achievementsAwarded.push(...completion.achievementsAwarded)
  }

  return {
    xpAwarded,
    totalXp: await getXpTotal(userId, session),
    achievementsAwarded,
  }
}
