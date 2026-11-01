import mongoose from 'mongoose'
import { logger } from './logger.js'

export async function connectDatabase(uri: string, dbName: string): Promise<void> {
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, {
    dbName,
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
  })
  logger.info({ db: dbName }, 'database connected')
}

export function isDbReady(): boolean {
  return mongoose.connection.readyState === 1
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect()
}

/**
 * Ensures declared indexes exist. Idempotent; safe to call on every boot.
 * Uses createIndexes rather than syncIndexes so no index is ever dropped.
 */
export async function ensureIndexes(): Promise<void> {
  const { UserModel } = await import('./models/User.js')
  const { CourseModel } = await import('./models/Course.js')
  const { LessonModel } = await import('./models/Lesson.js')
  const { ProgressModel } = await import('./models/Progress.js')
  await Promise.all([
    UserModel.createIndexes(),
    CourseModel.createIndexes(),
    LessonModel.createIndexes(),
    ProgressModel.createIndexes(),
  ])
}
