import { CourseModel } from '../models/Course.js'
import { LessonModel } from '../models/Lesson.js'
import { courseBundles, validateContent } from '../content/index.js'

export interface SeedResult {
  seededCourses: number
  seededLessons: number
  storedCourses: number
  storedLessons: number
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

  const [storedCourses, storedLessons, distinctLessonSlugs, previewLessons] = await Promise.all([
    CourseModel.countDocuments(),
    LessonModel.countDocuments(),
    LessonModel.distinct('slug').then((slugs) => slugs.length),
    LessonModel.countDocuments({ isPreview: true }),
  ])

  if (storedLessons !== distinctLessonSlugs) {
    throw new Error('Duplicate lesson records detected after seeding.')
  }
  if (previewLessons !== 1) {
    throw new Error(`Expected exactly one preview lesson after seeding, found ${previewLessons}.`)
  }

  return {
    seededCourses: courseBundles.length,
    seededLessons: courseBundles.reduce((sum, bundle) => sum + bundle.lessons.length, 0),
    storedCourses,
    storedLessons,
    previewLessons,
  }
}
