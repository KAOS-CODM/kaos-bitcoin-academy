import mongoose, { Schema } from 'mongoose'

export type PublishStatus = 'published' | 'draft'

export interface CourseModule {
  slug: string
  title: string
  order: number
}

export interface Course {
  slug: string
  title: string
  description: string
  level: string
  order: number
  status: PublishStatus
  estimatedMinutes: number
  modules: CourseModule[]
  createdAt: Date
  updatedAt: Date
}

const moduleSchema = new Schema<CourseModule>(
  {
    slug: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    order: { type: Number, required: true, min: 1 },
  },
  { _id: false },
)

const courseSchema = new Schema<Course>(
  {
    slug: { type: String, required: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    level: { type: String, required: true, trim: true },
    order: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      required: true,
      enum: ['published', 'draft'],
      default: 'draft',
      index: true,
    },
    estimatedMinutes: { type: Number, required: true, min: 1 },
    modules: { type: [moduleSchema], default: [] },
  },
  { timestamps: true },
)

courseSchema.index({ slug: 1 }, { unique: true, name: 'courses_slug_unique' })
courseSchema.index({ status: 1, order: 1 }, { name: 'courses_status_order' })

export const CourseModel = mongoose.model<Course>('Course', courseSchema)
