import mongoose, { Schema, Types } from 'mongoose'

export interface Progress {
  userId: Types.ObjectId
  lessonSlug: string
  courseSlug: string
  completedAt: Date
  createdAt: Date
  updatedAt: Date
}

const progressSchema = new Schema<Progress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lessonSlug: { type: String, required: true, trim: true, lowercase: true },
    courseSlug: { type: String, required: true, trim: true, lowercase: true },
    completedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true },
)

// One completion record per learner per lesson; the database enforces it.
progressSchema.index(
  { userId: 1, lessonSlug: 1 },
  { unique: true, name: 'progress_user_lesson_unique' },
)
progressSchema.index({ userId: 1, courseSlug: 1 }, { name: 'progress_user_course' })

export const ProgressModel = mongoose.model<Progress>('Progress', progressSchema)
