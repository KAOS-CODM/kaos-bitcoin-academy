import mongoose, { Schema } from 'mongoose'
import type { PublishStatus } from './Course.js'

export type QuizKind = 'lesson' | 'course'

export interface QuizOption {
  id: string
  text: string
}

export interface QuizQuestion {
  id: string
  prompt: string
  scenario?: string
  explanation: string
  options: QuizOption[]
  correctOptionId: string
}

export interface Quiz {
  slug: string
  kind: QuizKind
  courseSlug: string
  lessonSlug?: string
  title: string
  passingScore: number
  status: PublishStatus
  version: number
  questions: QuizQuestion[]
  createdAt: Date
  updatedAt: Date
}

const optionSchema = new Schema<QuizOption>(
  {
    id: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
  },
  { _id: false },
)

const questionSchema = new Schema<QuizQuestion>(
  {
    id: { type: String, required: true, trim: true },
    prompt: { type: String, required: true, trim: true },
    scenario: { type: String, trim: true },
    explanation: { type: String, required: true, trim: true },
    options: { type: [optionSchema], required: true },
    correctOptionId: { type: String, required: true, trim: true },
  },
  { _id: false },
)

const quizSchema = new Schema<Quiz>(
  {
    slug: { type: String, required: true, trim: true, lowercase: true },
    kind: { type: String, required: true, enum: ['lesson', 'course'] },
    courseSlug: { type: String, required: true, trim: true, lowercase: true },
    lessonSlug: { type: String, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    passingScore: { type: Number, required: true, min: 1, max: 100 },
    status: {
      type: String,
      required: true,
      enum: ['published', 'draft'],
      default: 'draft',
    },
    version: { type: Number, required: true, min: 1, default: 1 },
    questions: { type: [questionSchema], required: true, default: [] },
  },
  { timestamps: true, collection: 'quizzes' },
)

quizSchema.index({ slug: 1 }, { unique: true, name: 'quizzes_slug_unique' })
quizSchema.index({ kind: 1, courseSlug: 1 }, { name: 'quizzes_kind_course' })
quizSchema.index({ lessonSlug: 1 }, { name: 'quizzes_lesson' })
quizSchema.index({ status: 1, kind: 1 }, { name: 'quizzes_status_kind' })

export const QuizModel = mongoose.model<Quiz>('Quiz', quizSchema)
