import { config } from '../config.js'
import { connectDatabase, disconnectDatabase, ensureIndexes } from '../db.js'
import { seedContent } from './seedContent.js'
import { logger } from '../logger.js'

async function main(): Promise<void> {
  if (!config.mongodbUri) {
    console.error(
      'MONGODB_URI is not set. Add it to server/.env (see server/.env.example) before seeding.',
    )
    process.exit(1)
  }

  await connectDatabase(config.mongodbUri, config.mongodbDb)
  await ensureIndexes()

  const result = await seedContent()

  logger.info(result, 'content seed complete')
  await disconnectDatabase()
}

main().catch(async (error) => {
  logger.error({ err: error }, 'seed failed')
  await disconnectDatabase().catch(() => undefined)
  process.exit(1)
})
