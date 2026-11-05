import mongoose, { Schema, Types } from 'mongoose'

export interface AttemptAnswer {
  questionId: string
  selectedOptionId: string
  correct: boolean
}

export interface AttemptFeedback {
  questionId: string
  selectedOptionId: string
  correctOptionId: string
  correct: boolean
  explanation: string
}

export interface QuizAttempt {
  userId: Types.ObjectId
  quizId: Types.ObjectId
  quizSlug: string
  quizVersion: number
  courseSlug: string
  lessonSlug?: string
  attemptKey: string
  answers: AttemptAnswer[]
  feedback: AttemptFeedback[]
  score: number
  total: number
  percent: number
  passed: boolean
  completedAt: Date
  createdAt: Date
  updatedAt: Date
}

const answerSchema = new Schema<AttemptAnswer>(
  {
    questionId: { type: String, required: true },
    selectedOptionId: { type: String, required: true },
    correct: { type: Boolean, required: true },
  },
  { _id: false },
)

const feedbackSchema = new Schema<AttemptFeedback>(
  {
    questionId: { type: String, required: true },
    selectedOptionId: { type: String, required: true },
    correctOptionId: { type: String, required: true },
    correct: { type: Boolean, required: true },
    explanation: { type: String, required: true },
  },
  { _id: false },
)

const quizAttemptSchema = new Schema<QuizAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    quizSlug: { type: String, required: true, trim: true, lowercase: true },
    quizVersion: { type: Number, required: true, min: 1 },
    courseSlug: { type: String, required: true, trim: true, lowercase: true },
    lessonSlug: { type: String, trim: true, lowercase: true },
    attemptKey: { type: String, required: true, trim: true },
    answers: { type: [answerSchema], required: true },
    feedback: { type: [feedbackSchema], required: true },
    score: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 1 },
    percent: { type: Number, required: true, min: 0, max: 100 },
    passed: { type: Boolean, required: true },
    completedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true, collection: 'quiz_attempts' },
)

quizAttemptSchema.index(
  { userId: 1, quizId: 1, attemptKey: 1 },
  { unique: true, name: 'quiz_attempts_user_quiz_key_unique' },
)
quizAttemptSchema.index(
  { userId: 1, quizSlug: 1, completedAt: -1 },
  { name: 'quiz_attempts_user_quiz_recent' },
)
quizAttemptSchema.index(
  { userId: 1, courseSlug: 1, completedAt: -1 },
  { name: 'quiz_attempts_user_course_recent' },
)

export const QuizAttemptModel = mongoose.model<QuizAttempt>('QuizAttempt', quizAttemptSchema)
