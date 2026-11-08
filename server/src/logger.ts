import pino from 'pino'
import { config } from './config.js'

export const logger = pino({
  level: config.isTest ? 'silent' : config.logLevel,
  base: { service: 'kaos-bitcoin-academy' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'res.headers["set-cookie"]',
      'password',
      'passwordHash',
      '*.password',
      '*.passwordHash',
      '*.secret',
      'MONGODB_URI',
      'SESSION_SECRET',
      'OPENROUTER_API_KEY',
      'openRouterApiKey',
      'apiKey',
      '*.apiKey',
      'req.body.message',
      'req.body.history',
    ],
    censor: '[redacted]',
  },
})
