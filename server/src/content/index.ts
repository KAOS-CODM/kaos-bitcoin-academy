import type { CourseBundle, CourseSeed, LessonSeed } from './types.js'
import { bitcoin101 } from './courses/01-bitcoin-101.js'
import { moneyAndBitcoin } from './courses/02-money-and-bitcoin.js'
import { howBitcoinWorks } from './courses/03-how-bitcoin-works.js'
import { bitcoinWallets } from './courses/04-bitcoin-wallets.js'
import { usingBitcoin } from './courses/05-using-bitcoin.js'
import { lightningNetwork } from './courses/06-lightning-network.js'
import { stayingSafe } from './courses/07-staying-safe.js'
import { beyondBitcoin } from './courses/08-beyond-bitcoin.js'

export const courseBundles: CourseBundle[] = [
  bitcoin101,
  moneyAndBitcoin,
  howBitcoinWorks,
  bitcoinWallets,
  usingBitcoin,
  lightningNetwork,
  stayingSafe,
  beyondBitcoin,
]

export const courses: CourseSeed[] = courseBundles.map((bundle) => bundle.course)
export const lessons: LessonSeed[] = courseBundles.flatMap((bundle) => bundle.lessons)

export interface ContentProblem {
  scope: string
  message: string
}

/**
 * Structural checks for authored content. Run by the seeder and by tests so a
 * broken curriculum cannot be published silently.
 */
export function validateContent(): ContentProblem[] {
  const problems: ContentProblem[] = []
  const courseSlugs = new Set<string>()
  const lessonSlugs = new Set<string>()

  for (const course of courses) {
    if (courseSlugs.has(course.slug)) {
      problems.push({ scope: course.slug, message: 'duplicate course slug' })
    }
    courseSlugs.add(course.slug)

    if (course.modules.length === 0) {
      problems.push({ scope: course.slug, message: 'course has no modules' })
    }
    const moduleSlugs = new Set(course.modules.map((module) => module.slug))
    if (moduleSlugs.size !== course.modules.length) {
      problems.push({ scope: course.slug, message: 'duplicate module slug' })
    }
  }

  for (const lesson of lessons) {
    if (lessonSlugs.has(lesson.slug)) {
      problems.push({ scope: lesson.slug, message: 'duplicate lesson slug' })
    }
    lessonSlugs.add(lesson.slug)

    if (!courseSlugs.has(lesson.courseSlug)) {
      problems.push({ scope: lesson.slug, message: 'unknown courseSlug' })
    }
    if (!lesson.objectives.length) {
      problems.push({ scope: lesson.slug, message: 'no learning objectives' })
    }
    if (!lesson.sections.length) {
      problems.push({ scope: lesson.slug, message: 'no sections' })
    }
    const hasBody = lesson.sections.some(
      (section) => (section.paragraphs?.length ?? 0) > 0 || (section.items?.length ?? 0) > 0,
    )
    if (!hasBody) {
      problems.push({ scope: lesson.slug, message: 'no readable body content' })
    }
  }

  const previews = lessons.filter((lesson) => lesson.isPreview)
  if (previews.length !== 1) {
    problems.push({
      scope: 'curriculum',
      message: `expected exactly one preview lesson, found ${previews.length}`,
    })
  }

  for (const course of courses) {
    const courseLessons = lessons.filter((lesson) => lesson.courseSlug === course.slug)
    if (courseLessons.length === 0) {
      problems.push({ scope: course.slug, message: 'course has no lessons' })
    }
    const moduleSlugs = new Set(course.modules.map((module) => module.slug))
    for (const lesson of courseLessons) {
      if (!moduleSlugs.has(lesson.moduleSlug)) {
        problems.push({
          scope: lesson.slug,
          message: `moduleSlug "${lesson.moduleSlug}" is not declared on the course`,
        })
      }
    }
  }

  return problems
}
