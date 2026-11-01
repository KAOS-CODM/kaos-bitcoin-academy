import mongoose, { Schema } from 'mongoose'
import type { PublishStatus } from './Course.js'

export type SectionType =
  | 'paragraph'
  | 'heading'
  | 'callout'
  | 'example'
  | 'list'
  | 'terms'
  | 'reflection'

export interface Term {
  term: string
  definition: string
}

export interface LessonSection {
  type: SectionType
  heading?: string
  paragraphs?: string[]
  items?: string[]
  terms?: Term[]
  title?: string
  prompt?: string
  variant?: 'note' | 'warning' | 'tip'
}

export interface Lesson {
  slug: string
  courseSlug: string
  moduleSlug: string
  title: string
  summary: string
  order: number
  minutes: number
  status: PublishStatus
  isPreview: boolean
  objectives: string[]
  sections: LessonSection[]
  createdAt: Date
  updatedAt: Date
}

const termSchema = new Schema<Term>(
  {
    term: { type: String, required: true, trim: true },
    definition: { type: String, required: true, trim: true },
  },
  { _id: false },
)

const sectionSchema = new Schema<LessonSection>(
  {
    type: {
      type: String,
      required: true,
      enum: ['paragraph', 'heading', 'callout', 'example', 'list', 'terms', 'reflection'],
    },
    heading: { type: String, trim: true },
    paragraphs: { type: [String], default: undefined },
    items: { type: [String], default: undefined },
    terms: { type: [termSchema], default: undefined },
    title: { type: String, trim: true },
    prompt: { type: String, trim: true },
    variant: { type: String, enum: ['note', 'warning', 'tip'] },
  },
  { _id: false },
)

const lessonSchema = new Schema<Lesson>(
  {
    slug: { type: String, required: true, trim: true, lowercase: true },
    courseSlug: { type: String, required: true, trim: true, lowercase: true },
    moduleSlug: { type: String, required: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true, maxlength: 280 },
    order: { type: Number, required: true, min: 1 },
    minutes: { type: Number, required: true, min: 1, max: 120 },
    status: {
      type: String,
      required: true,
      enum: ['published', 'draft'],
      default: 'draft',
    },
    isPreview: { type: Boolean, required: true, default: false },
    objectives: { type: [String], default: [] },
    sections: { type: [sectionSchema], default: [] },
  },
  { timestamps: true },
)

lessonSchema.index({ slug: 1 }, { unique: true, name: 'lessons_slug_unique' })
lessonSchema.index({ courseSlug: 1, order: 1 }, { name: 'lessons_course_order' })
lessonSchema.index({ status: 1, courseSlug: 1 }, { name: 'lessons_status_course' })
lessonSchema.index(
  { isPreview: 1 },
  { unique: true, partialFilterExpression: { isPreview: true }, name: 'lessons_single_preview' },
)

export const LessonModel = mongoose.model<Lesson>('Lesson', lessonSchema)
