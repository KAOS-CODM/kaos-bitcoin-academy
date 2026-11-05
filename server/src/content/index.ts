import type {
  AchievementSeed,
  CourseBundle,
  CourseSeed,
  LessonSeed,
  QuizSeed,
} from './types.js'
import { achievements } from './achievements.js'
import { quizzes } from './quizzes/index.js'
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
export { achievements, quizzes }
export type { AchievementSeed, QuizSeed }

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

  return [...problems, ...validateQuizzes()]
}

/**
 * Structural validation for authored quizzes and achievements. This is a
 * schema/content check, not a substitute for human technical review.
 */
export function validateQuizzes(): ContentProblem[] {
  const problems: ContentProblem[] = []
  const courseBySlug = new Map(courses.map((course) => [course.slug, course]))
  const lessonBySlug = new Map(lessons.map((lesson) => [lesson.slug, lesson]))
  const quizSlugs = new Set<string>()
  const lessonQuizCounts = new Map<string, number>()
  const courseQuizCounts = new Map<string, number>()

  for (const quiz of quizzes) {
    if (quizSlugs.has(quiz.slug)) {
      problems.push({ scope: quiz.slug, message: 'duplicate quiz slug' })
    }
    quizSlugs.add(quiz.slug)

    if (!quiz.title.trim()) {
      problems.push({ scope: quiz.slug, message: 'quiz title is empty' })
    }
    if (quiz.passingScore < 1 || quiz.passingScore > 100) {
      problems.push({ scope: quiz.slug, message: 'passing score must be between 1 and 100' })
    }
    if (!courseBySlug.has(quiz.courseSlug)) {
      problems.push({ scope: quiz.slug, message: 'unknown courseSlug' })
    }

    if (quiz.kind === 'lesson') {
      if (!quiz.lessonSlug) {
        problems.push({ scope: quiz.slug, message: 'lesson quiz is missing lessonSlug' })
      } else {
        const lesson = lessonBySlug.get(quiz.lessonSlug)
        if (!lesson) {
          problems.push({ scope: quiz.slug, message: 'unknown lessonSlug' })
        } else if (lesson.courseSlug !== quiz.courseSlug) {
          problems.push({
            scope: quiz.slug,
            message: 'lessonSlug does not belong to the declared course',
          })
        }
      }
      lessonQuizCounts.set(quiz.lessonSlug ?? '', (lessonQuizCounts.get(quiz.lessonSlug ?? '') ?? 0) + 1)
      if (quiz.questions.length < 2 || quiz.questions.length > 3) {
        problems.push({ scope: quiz.slug, message: 'lesson quiz must have 2-3 questions' })
      }
    } else {
      if (quiz.lessonSlug) {
        problems.push({ scope: quiz.slug, message: 'course assessment must not have lessonSlug' })
      }
      courseQuizCounts.set(
        quiz.courseSlug,
        (courseQuizCounts.get(quiz.courseSlug) ?? 0) + 1,
      )
      if (quiz.questions.length < 5 || quiz.questions.length > 8) {
        problems.push({ scope: quiz.slug, message: 'course assessment must have 5-8 questions' })
      }
      const expected = quiz.courseSlug === '01-bitcoin-101' ? 8 : 5
      if (quiz.questions.length !== expected) {
        problems.push({
          scope: quiz.slug,
          message: `expected ${expected} assessment questions for ${quiz.courseSlug}`,
        })
      }
    }

    const questionIds = new Set<string>()
    for (const question of quiz.questions) {
      if (questionIds.has(question.id)) {
        problems.push({ scope: quiz.slug, message: `duplicate question id "${question.id}"` })
      }
      questionIds.add(question.id)

      if (!question.prompt.trim()) {
        problems.push({ scope: quiz.slug, message: `question ${question.id} has an empty prompt` })
      }
      if (!question.explanation.trim()) {
        problems.push({
          scope: quiz.slug,
          message: `question ${question.id} has an empty explanation`,
        })
      }
      if (question.options.length < 3 || question.options.length > 4) {
        problems.push({
          scope: quiz.slug,
          message: `question ${question.id} must have 3-4 options`,
        })
      }

      const optionIds = new Set<string>()
      const optionTexts = new Set<string>()
      for (const option of question.options) {
        if (optionIds.has(option.id)) {
          problems.push({
            scope: quiz.slug,
            message: `question ${question.id} has duplicate option id "${option.id}"`,
          })
        }
        optionIds.add(option.id)
        const normalizedText = option.text.trim().toLowerCase()
        if (!normalizedText) {
          problems.push({
            scope: quiz.slug,
            message: `question ${question.id} has an empty option`,
          })
        }
        if (optionTexts.has(normalizedText)) {
          problems.push({
            scope: quiz.slug,
            message: `question ${question.id} has duplicate option text`,
          })
        }
        optionTexts.add(normalizedText)
      }

      if (!optionIds.has(question.correctOptionId)) {
        problems.push({
          scope: quiz.slug,
          message: `question ${question.id} correctOptionId does not match an option`,
        })
      }
    }
  }

  for (const lesson of lessons) {
    const count = lessonQuizCounts.get(lesson.slug) ?? 0
    if (count !== 1) {
      problems.push({
        scope: lesson.slug,
        message: `expected exactly one lesson quiz, found ${count}`,
      })
    }
  }

  for (const course of courses) {
    const count = courseQuizCounts.get(course.slug) ?? 0
    if (count !== 1) {
      problems.push({
        scope: course.slug,
        message: `expected exactly one course assessment, found ${count}`,
      })
    }
  }

  const lessonQuizTotal = quizzes.filter((quiz) => quiz.kind === 'lesson').length
  const courseQuizTotal = quizzes.filter((quiz) => quiz.kind === 'course').length
  if (lessonQuizTotal !== 22) {
    problems.push({
      scope: 'quizzes',
      message: `expected 22 lesson quizzes, found ${lessonQuizTotal}`,
    })
  }
  if (courseQuizTotal !== 8) {
    problems.push({
      scope: 'quizzes',
      message: `expected 8 course assessments, found ${courseQuizTotal}`,
    })
  }
  if (quizzes.length !== 30) {
    problems.push({ scope: 'quizzes', message: `expected 30 quizzes, found ${quizzes.length}` })
  }

  if (achievements.length !== 3) {
    problems.push({
      scope: 'achievements',
      message: `expected 3 achievements, found ${achievements.length}`,
    })
  }
  const achievementSlugs = new Set<string>()
  for (const achievement of achievements) {
    if (achievementSlugs.has(achievement.slug)) {
      problems.push({ scope: achievement.slug, message: 'duplicate achievement slug' })
    }
    achievementSlugs.add(achievement.slug)
    if (!achievement.title.trim() || !achievement.description.trim()) {
      problems.push({ scope: achievement.slug, message: 'achievement text is incomplete' })
    }
  }

  return problems
}
