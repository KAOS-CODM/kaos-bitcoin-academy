import mongoose, { Schema } from 'mongoose'
import type { PublishStatus } from './Course.js'

export interface Achievement {
  slug: string
  title: string
  description: string
  order: number
  status: PublishStatus
  createdAt: Date
  updatedAt: Date
}

const achievementSchema = new Schema<Achievement>(
  {
    slug: { type: String, required: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    order: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      required: true,
      enum: ['published', 'draft'],
      default: 'draft',
    },
  },
  { timestamps: true, collection: 'achievements' },
)

achievementSchema.index({ slug: 1 }, { unique: true, name: 'achievements_slug_unique' })

export const AchievementModel = mongoose.model<Achievement>('Achievement', achievementSchema)
