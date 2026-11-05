import mongoose, { Schema, Types } from 'mongoose'

export interface UserAchievement {
  userId: Types.ObjectId
  achievementSlug: string
  earnedAt: Date
}

const userAchievementSchema = new Schema<UserAchievement>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    achievementSlug: { type: String, required: true, trim: true, lowercase: true },
    earnedAt: { type: Date, required: true, default: () => new Date() },
  },
  { collection: 'user_achievements' },
)

userAchievementSchema.index(
  { userId: 1, achievementSlug: 1 },
  { unique: true, name: 'user_achievements_user_slug_unique' },
)
userAchievementSchema.index(
  { userId: 1, earnedAt: -1 },
  { name: 'user_achievements_user_recent' },
)

export const UserAchievementModel = mongoose.model<UserAchievement>(
  'UserAchievement',
  userAchievementSchema,
)
