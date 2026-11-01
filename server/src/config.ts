import 'dotenv/config'
import { z } from 'zod'
import { fileURLToPath } from 'node:url'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),
  MONGODB_URI: z.string().min(1).optional(),
  MONGODB_DB: z.string().min(1).default('kaos_academy'),
  SESSION_SECRET: z.string().min(32).optional(),
  APP_ORIGIN: z.string().url().optional(),
  RENDER_EXTERNAL_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
})

const parsed = EnvSchema.safeParse(
  Object.fromEntries(
    // An empty value in .env (common when copying the example) means "not set".
    Object.entries(process.env).map(([key, value]) => [key, value === '' ? undefined : value]),
  ),
)

if (!parsed.success) {
  const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
  // Never print values: they may contain credentials.
  console.error(`Invalid environment configuration. Check: ${fields}`)
  process.exit(1)
}

const env = parsed.data
const isProd = env.NODE_ENV === 'production'

if (isProd && !env.MONGODB_URI) {
  console.error('MONGODB_URI is required in production. Refusing to start.')
  process.exit(1)
}

if (isProd && !env.SESSION_SECRET) {
  console.error('SESSION_SECRET is required in production. Refusing to start.')
  process.exit(1)
}

if (!isProd && !env.SESSION_SECRET) {
  console.warn('SESSION_SECRET is not set; using an insecure development-only secret.')
}

const allowedOrigins = [env.APP_ORIGIN, env.RENDER_EXTERNAL_URL].filter(
  (value): value is string => Boolean(value),
)

export const config = {
  nodeEnv: env.NODE_ENV,
  isProd,
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  mongodbUri: env.MONGODB_URI,
  mongodbDb: env.MONGODB_DB,
  sessionSecret:
    env.SESSION_SECRET ?? 'development-only-insecure-session-secret-change-me',
  allowedOrigins,
  logLevel: env.LOG_LEVEL,
  // server/src (dev) and server/dist (build) are both two levels below the repo root.
  clientDist: fileURLToPath(new URL('../../client/dist/', import.meta.url)),
  sessionCookieName: isProd ? '__Host-kaos_session' : 'kaos_session',
} as const
