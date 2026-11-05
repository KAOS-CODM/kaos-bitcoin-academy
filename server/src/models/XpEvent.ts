import mongoose, { Schema, Types } from 'mongoose'

export type XpSource = 'lesson_check_pass' | 'course_assessment_pass' | 'course_complete'

export interface XpEvent {
  userId: Types.ObjectId
  eventKey: string
  amount: number
  source: XpSource
  sourceId: string
  createdAt: Date
}

const xpEventSchema = new Schema<XpEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventKey: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    source: {
      type: String,
      required: true,
      enum: ['lesson_check_pass', 'course_assessment_pass', 'course_complete'],
    },
    sourceId: { type: String, required: true, trim: true },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { collection: 'xp_events' },
)

xpEventSchema.index(
  { userId: 1, eventKey: 1 },
  { unique: true, name: 'xp_events_user_key_unique' },
)
xpEventSchema.index({ userId: 1, createdAt: -1 }, { name: 'xp_events_user_recent' })

export const XpEventModel = mongoose.model<XpEvent>('XpEvent', xpEventSchema)
