import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  achievements,
  courses,
  lessons,
  quizzes,
  validateQuizzes,
} from '../src/content/index.js'

describe('S2 quiz content', () => {
  test('contains 30 quizzes: 22 lesson checks and 8 course assessments', () => {
    assert.equal(quizzes.length, 30)
    assert.equal(quizzes.filter((quiz) => quiz.kind === 'lesson').length, 22)
    assert.equal(quizzes.filter((quiz) => quiz.kind === 'course').length, 8)
    assert.equal(achievements.length, 3)
  })

  test('every published lesson has one 2-3 question check', () => {
    for (const lesson of lessons) {
      const checks = quizzes.filter(
        (quiz) => quiz.kind === 'lesson' && quiz.lessonSlug === lesson.slug,
      )
      assert.equal(checks.length, 1, `lesson ${lesson.slug}`)
      const check = checks[0]
      assert.ok(check)
      assert.ok(check.questions.length >= 2 && check.questions.length <= 3)
      assert.equal(check.courseSlug, lesson.courseSlug)
      assert.equal(check.passingScore, 67)
    }
  })

  test('every course has one assessment with the approved question count', () => {
    for (const course of courses) {
      const assessments = quizzes.filter(
        (quiz) => quiz.kind === 'course' && quiz.courseSlug === course.slug,
      )
      assert.equal(assessments.length, 1, `course ${course.slug}`)
      const assessment = assessments[0]
      assert.ok(assessment)
      assert.equal(assessment.lessonSlug, undefined)
      assert.equal(assessment.passingScore, 80)
      assert.equal(assessment.questions.length, course.slug === '01-bitcoin-101' ? 8 : 5)
    }
  })

  test('quiz, question and option identifiers are unique and answer keys resolve', () => {
    const slugs = new Set<string>()
    for (const quiz of quizzes) {
      assert.equal(slugs.has(quiz.slug), false, `duplicate slug ${quiz.slug}`)
      slugs.add(quiz.slug)

      const questionIds = new Set<string>()
      for (const question of quiz.questions) {
        assert.equal(questionIds.has(question.id), false, `${quiz.slug} ${question.id}`)
        questionIds.add(question.id)
        assert.ok(question.prompt.trim().length > 0)
        assert.ok(question.explanation.trim().length > 0)
        assert.ok(question.options.length >= 3 && question.options.length <= 4)

        const optionIds = new Set<string>()
        for (const option of question.options) {
          assert.equal(optionIds.has(option.id), false, `${quiz.slug} ${question.id} ${option.id}`)
          optionIds.add(option.id)
          assert.ok(option.text.trim().length > 0)
        }
        assert.ok(optionIds.has(question.correctOptionId))
      }
    }
  })

  test('answer keys are spread across option positions', () => {
    const positions = [0, 0, 0]
    for (const quiz of quizzes) {
      for (const question of quiz.questions) {
        const index = question.options.findIndex(
          (option) => option.id === question.correctOptionId,
        )
        assert.ok(index >= 0 && index < positions.length)
        positions[index] += 1
      }
    }

    assert.ok(Math.max(...positions) - Math.min(...positions) <= 3, positions.join(','))
  })

  test('course assessments do not make the key the uniquely longest option', () => {
    for (const quiz of quizzes.filter((item) => item.kind === 'course')) {
      for (const question of quiz.questions) {
        const lengths = question.options.map((option) => option.text.length)
        const longest = Math.max(...lengths)
        const key = question.options.find((option) => option.id === question.correctOptionId)
        const uniqueLongest = lengths.filter((length) => length === longest).length === 1
        assert.equal(
          uniqueLongest && key?.text.length === longest,
          false,
          `${quiz.slug} ${question.id}`,
        )
      }
    }
  })

  test('quizzes reference existing published courses and lessons', () => {
    const courseSlugs = new Set(courses.map((course) => course.slug))
    const lessonBySlug = new Map(lessons.map((lesson) => [lesson.slug, lesson]))
    for (const quiz of quizzes) {
      assert.ok(courseSlugs.has(quiz.courseSlug), quiz.slug)
      if (quiz.kind === 'lesson') {
        assert.ok(quiz.lessonSlug, quiz.slug)
        const lesson = lessonBySlug.get(quiz.lessonSlug as string)
        assert.ok(lesson, quiz.slug)
        assert.equal(lesson?.courseSlug, quiz.courseSlug)
      }
    }
  })

  test('structural validation reports no quiz or achievement problems', () => {
    assert.deepEqual(validateQuizzes(), [])
  })
})
