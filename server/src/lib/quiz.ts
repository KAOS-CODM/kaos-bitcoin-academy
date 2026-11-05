import type { QuizKind } from '../content/types.js'

export interface QuizOptionDefinition {
  id: string
  text: string
}

export interface QuizQuestionDefinition {
  id: string
  prompt: string
  scenario?: string
  explanation: string
  options: QuizOptionDefinition[]
  correctOptionId: string
}

export interface QuizDefinition {
  slug: string
  kind: QuizKind
  courseSlug: string
  lessonSlug?: string
  title: string
  passingScore: number
  version?: number
  questions: QuizQuestionDefinition[]
}

export interface SubmittedAnswer {
  questionId: string
  optionId: string
}

export interface CanonicalAnswer {
  questionId: string
  selectedOptionId: string
  correct: boolean
}

export interface QuizFeedback {
  questionId: string
  selectedOptionId: string
  correctOptionId: string
  correct: boolean
  explanation: string
}

export interface QuizScore {
  score: number
  total: number
  percent: number
  passed: boolean
  answers: CanonicalAnswer[]
  feedback: QuizFeedback[]
}

export interface PublicQuiz {
  slug: string
  kind: QuizKind
  courseSlug: string
  lessonSlug?: string
  title: string
  passingScore: number
  questionCount: number
  version: number
  questions: Array<{
    id: string
    prompt: string
    scenario?: string
    options: QuizOptionDefinition[]
  }>
}

export class QuizAnswerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QuizAnswerError'
  }
}

/**
 * Validates and canonicalizes submitted answers, then scores them on the server.
 * No score, pass flag, correctness flag or XP amount is accepted from the client.
 */
export function scoreQuiz(quiz: QuizDefinition, submitted: SubmittedAnswer[]): QuizScore {
  if (quiz.questions.length === 0) {
    throw new QuizAnswerError('This quiz has no questions.')
  }

  const questionById = new Map(quiz.questions.map((question) => [question.id, question]))
  const seenQuestions = new Set<string>()

  for (const answer of submitted) {
    if (seenQuestions.has(answer.questionId)) {
      throw new QuizAnswerError('Each question may be answered only once.')
    }
    seenQuestions.add(answer.questionId)

    const question = questionById.get(answer.questionId)
    if (!question) {
      throw new QuizAnswerError('One or more answers refer to an unknown question.')
    }
    if (!question.options.some((option) => option.id === answer.optionId)) {
      throw new QuizAnswerError('One or more answers refer to an unknown option.')
    }
  }

  if (submitted.length !== quiz.questions.length) {
    throw new QuizAnswerError('Answer every question before submitting.')
  }

  const byQuestion = new Map(submitted.map((answer) => [answer.questionId, answer]))
  const answers: CanonicalAnswer[] = []
  const feedback: QuizFeedback[] = []

  for (const question of quiz.questions) {
    const answer = byQuestion.get(question.id)
    if (!answer) {
      throw new QuizAnswerError('Answer every question before submitting.')
    }
    const correct = answer.optionId === question.correctOptionId
    answers.push({
      questionId: question.id,
      selectedOptionId: answer.optionId,
      correct,
    })
    feedback.push({
      questionId: question.id,
      selectedOptionId: answer.optionId,
      correctOptionId: question.correctOptionId,
      correct,
      explanation: question.explanation,
    })
  }

  const score = answers.filter((answer) => answer.correct).length
  const total = quiz.questions.length
  const percent = total === 0 ? 0 : Math.round((score / total) * 100)

  return {
    score,
    total,
    percent,
    passed: percent >= quiz.passingScore,
    answers,
    feedback,
  }
}

/** Public pre-submission DTO. It deliberately contains no answer key. */
export function toPublicQuiz(quiz: QuizDefinition): PublicQuiz {
  return {
    slug: quiz.slug,
    kind: quiz.kind,
    courseSlug: quiz.courseSlug,
    ...(quiz.lessonSlug ? { lessonSlug: quiz.lessonSlug } : {}),
    title: quiz.title,
    passingScore: quiz.passingScore,
    questionCount: quiz.questions.length,
    version: quiz.version ?? 1,
    questions: quiz.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      ...(question.scenario ? { scenario: question.scenario } : {}),
      options: question.options.map((option) => ({ id: option.id, text: option.text })),
    })),
  }
}

export function canonicalAnswersEqual(
  left: Array<{ questionId: string; selectedOptionId: string }>,
  right: Array<{ questionId: string; selectedOptionId: string }>,
): boolean {
  if (left.length !== right.length) return false
  return left.every(
    (answer, index) =>
      answer.questionId === right[index]?.questionId &&
      answer.selectedOptionId === right[index]?.selectedOptionId,
  )
}
