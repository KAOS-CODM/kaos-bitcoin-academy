import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  canonicalAnswersEqual,
  QuizAnswerError,
  scoreQuiz,
  toPublicQuiz,
  type QuizDefinition,
} from '../src/lib/quiz.js'
import { isCourseComplete } from '../src/lib/progress.js'

const quiz: QuizDefinition = {
  slug: 'sample-check',
  kind: 'lesson',
  courseSlug: '01-bitcoin-101',
  lessonSlug: 'sample-lesson',
  title: 'Sample check',
  passingScore: 67,
  version: 1,
  questions: [
    {
      id: 'q1',
      prompt: 'Question one?',
      explanation: 'Because one is correct.',
      options: [
        { id: 'a', text: 'One' },
        { id: 'b', text: 'Two' },
        { id: 'c', text: 'Three' },
      ],
      correctOptionId: 'a',
    },
    {
      id: 'q2',
      prompt: 'Question two?',
      explanation: 'Because two is correct.',
      options: [
        { id: 'a', text: 'One' },
        { id: 'b', text: 'Two' },
        { id: 'c', text: 'Three' },
      ],
      correctOptionId: 'b',
    },
    {
      id: 'q3',
      prompt: 'Question three?',
      explanation: 'Because three is correct.',
      options: [
        { id: 'a', text: 'One' },
        { id: 'b', text: 'Two' },
        { id: 'c', text: 'Three' },
      ],
      correctOptionId: 'c',
    },
  ],
}

describe('quiz scoring', () => {
  test('scores correct, incorrect and mixed answers', () => {
    const correct = scoreQuiz(quiz, [
      { questionId: 'q1', optionId: 'a' },
      { questionId: 'q2', optionId: 'b' },
      { questionId: 'q3', optionId: 'c' },
    ])
    assert.equal(correct.score, 3)
    assert.equal(correct.percent, 100)
    assert.equal(correct.passed, true)

    const incorrect = scoreQuiz(quiz, [
      { questionId: 'q1', optionId: 'b' },
      { questionId: 'q2', optionId: 'c' },
      { questionId: 'q3', optionId: 'a' },
    ])
    assert.equal(incorrect.score, 0)
    assert.equal(incorrect.passed, false)

    const mixed = scoreQuiz(quiz, [
      { questionId: 'q3', optionId: 'c' },
      { questionId: 'q1', optionId: 'b' },
      { questionId: 'q2', optionId: 'b' },
    ])
    assert.equal(mixed.score, 2)
    assert.equal(mixed.percent, 67)
    assert.equal(mixed.passed, true)
    assert.deepEqual(
      mixed.answers.map((answer) => answer.questionId),
      ['q1', 'q2', 'q3'],
    )
  })

  test('treats exactly the passing boundary as a pass', () => {
    const boundary = scoreQuiz({ ...quiz, passingScore: 67 }, [
      { questionId: 'q1', optionId: 'a' },
      { questionId: 'q2', optionId: 'b' },
      { questionId: 'q3', optionId: 'a' },
    ])
    assert.equal(boundary.percent, 67)
    assert.equal(boundary.passed, true)

    const justBelow = scoreQuiz({ ...quiz, passingScore: 68 }, [
      { questionId: 'q1', optionId: 'a' },
      { questionId: 'q2', optionId: 'b' },
      { questionId: 'q3', optionId: 'a' },
    ])
    assert.equal(justBelow.percent, 67)
    assert.equal(justBelow.passed, false)
  })

  test('rejects missing, duplicate, unknown and malformed answers', () => {
    assert.throws(
      () =>
        scoreQuiz(quiz, [
          { questionId: 'q1', optionId: 'a' },
          { questionId: 'q2', optionId: 'b' },
        ]),
      QuizAnswerError,
    )
    assert.throws(
      () =>
        scoreQuiz(quiz, [
          { questionId: 'q1', optionId: 'a' },
          { questionId: 'q1', optionId: 'b' },
          { questionId: 'q3', optionId: 'c' },
        ]),
      QuizAnswerError,
    )
    assert.throws(
      () =>
        scoreQuiz(quiz, [
          { questionId: 'q1', optionId: 'a' },
          { questionId: 'q2', optionId: 'b' },
          { questionId: 'unknown', optionId: 'c' },
        ]),
      QuizAnswerError,
    )
    assert.throws(
      () =>
        scoreQuiz(quiz, [
          { questionId: 'q1', optionId: 'a' },
          { questionId: 'q2', optionId: 'b' },
          { questionId: 'q3', optionId: 'unknown' },
        ]),
      QuizAnswerError,
    )
  })

  test('rejects a zero-question quiz', () => {
    assert.throws(() => scoreQuiz({ ...quiz, questions: [] }, []), QuizAnswerError)
  })

  test('public DTO omits answer keys and explanations', () => {
    const publicQuiz = toPublicQuiz(quiz)
    const serialized = JSON.stringify(publicQuiz)
    assert.equal(serialized.includes('correctOptionId'), false)
    assert.equal(serialized.includes('Because one is correct'), false)
    assert.equal(publicQuiz.questionCount, 3)
    assert.equal(publicQuiz.questions[0]?.options.length, 3)
  })

  test('canonical answer comparison ignores submitted order but not values', () => {
    assert.equal(
      canonicalAnswersEqual(
        [
          { questionId: 'q1', selectedOptionId: 'a' },
          { questionId: 'q2', selectedOptionId: 'b' },
        ],
        [
          { questionId: 'q1', selectedOptionId: 'a' },
          { questionId: 'q2', selectedOptionId: 'b' },
        ],
      ),
      true,
    )
    assert.equal(
      canonicalAnswersEqual(
        [
          { questionId: 'q1', selectedOptionId: 'a' },
          { questionId: 'q2', selectedOptionId: 'b' },
        ],
        [
          { questionId: 'q1', selectedOptionId: 'a' },
          { questionId: 'q2', selectedOptionId: 'c' },
        ],
      ),
      false,
    )
  })
})

describe('course completion predicate', () => {
  test('requires published lessons and a passed assessment', () => {
    assert.equal(isCourseComplete(0, 0, true), false)
    assert.equal(isCourseComplete(4, 4, false), false)
    assert.equal(isCourseComplete(4, 3, true), false)
    assert.equal(isCourseComplete(4, 4, true), true)
  })
})
