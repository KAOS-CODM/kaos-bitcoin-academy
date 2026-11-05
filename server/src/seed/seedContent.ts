import { CourseModel } from '../models/Course.js'
import { LessonModel } from '../models/Lesson.js'
import { QuizModel } from '../models/Quiz.js'
import { AchievementModel } from '../models/Achievement.js'
import { achievements, courseBundles, quizzes, validateContent } from '../content/index.js'

export interface SeedResult {
  seededCourses: number
  seededLessons: number
  seededQuizzes: number
  seededAchievements: number
  storedCourses: number
  storedLessons: number
  storedQuizzes: number
  storedAchievements: number
  previewLessons: number
}

/**
 * Idempotent content seeding. Records are matched by stable slug and updated,
 * never duplicated. Safe to run repeatedly.
 */
export async function seedContent(): Promise<SeedResult> {
  const problems = validateContent()
  if (problems.length > 0) {
    throw new Error(
      `Content validation failed: ${problems
        .map((problem) => `[${problem.scope}] ${problem.message}`)
        .join('; ')}`,
    )
  }

  for (const [index, bundle] of courseBundles.entries()) {
    const { course, lessons } = bundle

    await CourseModel.findOneAndUpdate(
      { slug: course.slug },
      {
        $set: {
          slug: course.slug,
          title: course.title,
          description: course.description,
          level: course.level,
          order: course.order ?? index + 1,
          status: 'published',
          estimatedMinutes: course.estimatedMinutes,
          modules: course.modules,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    )

    for (const lesson of lessons) {
      await LessonModel.findOneAndUpdate(
        { slug: lesson.slug },
        {
          $set: {
            slug: lesson.slug,
            courseSlug: lesson.courseSlug,
            moduleSlug: lesson.moduleSlug,
            title: lesson.title,
            summary: lesson.summary,
            order: lesson.order,
            minutes: lesson.minutes,
            status: 'published',
            isPreview: lesson.isPreview ?? false,
            objectives: lesson.objectives,
            sections: lesson.sections,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
      )
    }
  }

  for (const quiz of quizzes) {
    const update: Record<string, unknown> = {
      $set: {
        slug: quiz.slug,
        kind: quiz.kind,
        courseSlug: quiz.courseSlug,
        title: quiz.title,
        passingScore: quiz.passingScore,
        status: 'published',
        version: 1,
        questions: quiz.questions,
      },
    }
    if (quiz.kind === 'lesson' && quiz.lessonSlug) {
      ;(update.$set as Record<string, unknown>).lessonSlug = quiz.lessonSlug
    } else {
      update.$unset = { lessonSlug: '' }
    }

    await QuizModel.findOneAndUpdate({ slug: quiz.slug }, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    })
  }

  await QuizModel.updateMany(
    { slug: { $nin: quizzes.map((quiz) => quiz.slug) } },
    { $set: { status: 'draft' } },
  )

  for (const achievement of achievements) {
    await AchievementModel.findOneAndUpdate(
      { slug: achievement.slug },
      {
        $set: {
          slug: achievement.slug,
          title: achievement.title,
          description: achievement.description,
          order: achievement.order,
          status: 'published',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    )
  }

  const [
    storedCourses,
    storedLessons,
    distinctLessonSlugs,
    previewLessons,
    storedQuizzes,
    publishedQuizzes,
    storedAchievements,
    publishedAuthoredAchievements,
  ] = await Promise.all([
    CourseModel.countDocuments(),
    LessonModel.countDocuments(),
    LessonModel.distinct('slug').then((slugs) => slugs.length),
    LessonModel.countDocuments({ isPreview: true }),
    QuizModel.countDocuments(),
    QuizModel.countDocuments({ status: 'published' }),
    AchievementModel.countDocuments(),
    AchievementModel.countDocuments({
      slug: { $in: achievements.map((achievement) => achievement.slug) },
      status: 'published',
    }),
  ])

  if (storedLessons !== distinctLessonSlugs) {
    throw new Error('Duplicate lesson records detected after seeding.')
  }
  if (previewLessons !== 1) {
    throw new Error(`Expected exactly one preview lesson after seeding, found ${previewLessons}.`)
  }
  if (publishedQuizzes !== 30) {
    throw new Error(`Expected exactly 30 published quizzes after seeding, found ${publishedQuizzes}.`)
  }
  if (publishedAuthoredAchievements !== achievements.length) {
    throw new Error(
      `Expected all ${achievements.length} authored achievements to be published after seeding, found ${publishedAuthoredAchievements}.`,
    )
  }

  return {
    seededCourses: courseBundles.length,
    seededLessons: courseBundles.reduce((sum, bundle) => sum + bundle.lessons.length, 0),
    seededQuizzes: quizzes.length,
    seededAchievements: achievements.length,
    storedCourses,
    storedLessons,
    storedQuizzes,
    storedAchievements,
    previewLessons,
  }
}
