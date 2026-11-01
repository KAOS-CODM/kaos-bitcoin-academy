import mongoose from 'mongoose'
import MongoStore from 'connect-mongo'
import { config } from './config.js'
import { logger } from './logger.js'
import { connectDatabase, disconnectDatabase, ensureIndexes } from './db.js'
import { createApp } from './app.js'

const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7

async function main(): Promise<void> {
  let sessionStore: MongoStore | undefined

  if (config.mongodbUri) {
    try {
      await connectDatabase(config.mongodbUri, config.mongodbDb)
      await ensureIndexes()
      sessionStore = MongoStore.create({
        client: mongoose.connection.getClient(),
        dbName: config.mongodbDb,
        collectionName: 'sessions',
        ttl: SEVEN_DAYS_SECONDS,
        autoRemove: 'native',
      })
    } catch (error) {
      logger.error({ err: error }, 'database connection failed')
      if (config.isProd) {
        process.exit(1)
      }
      logger.warn('starting without a database; data routes will return 503')
    }
  } else if (config.isProd) {
    // config.ts already refuses this, but keep the guard close to the use.
    process.exit(1)
  } else {
    logger.warn(
      'MONGODB_URI is not set; using in-memory sessions and data routes will return 503',
    )
  }

  const app = createApp({ sessionStore })
  const server = app.listen(config.port, () => {
    logger.info(
      { port: config.port, env: config.nodeEnv, db: config.mongodbUri ? 'configured' : 'missing' },
      'server listening',
    )
  })

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down')
    server.close(() => {
      void disconnectDatabase()
        .catch(() => undefined)
        .finally(() => process.exit(0))
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((error) => {
  logger.error({ err: error }, 'fatal startup error')
  process.exit(1)
})
