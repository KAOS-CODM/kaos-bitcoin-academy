import mongoose, { Schema } from 'mongoose'

export interface User {
  email: string
  passwordHash: string
  displayName: string
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<User>(
  {
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, required: true, trim: true, minlength: 2, maxlength: 40 },
  },
  { timestamps: true },
)

userSchema.index({ email: 1 }, { unique: true, name: 'users_email_unique' })

export const UserModel = mongoose.model<User>('User', userSchema)
