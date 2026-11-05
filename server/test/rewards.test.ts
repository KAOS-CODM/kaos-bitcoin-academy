import assert from 'node:assert/strict'
import { afterEach, test, mock } from 'node:test'
import type { ClientSession } from 'mongoose'
import { awardAchievement, awardXp } from '../src/lib/rewards.js'
import { XpEventModel } from '../src/models/XpEvent.js'
import { UserAchievementModel } from '../src/models/UserAchievement.js'

function duplicateKey(): Error {
  const error = new Error('duplicate key')
  ;(error as Error & { code: number }).code = 11000
  return error
}

afterEach(() => {
  mock.restoreAll()
})

test('awardXp propagates a duplicate key when a transaction session is present', async () => {
  mock.method(XpEventModel, 'updateOne', async () => {
    throw duplicateKey()
  })

  await assert.rejects(
    awardXp('user-1', 'event-1', 10, 'lesson_check_pass', 'quiz-1', {} as ClientSession),
    /duplicate key/,
  )
})

test('awardXp treats a duplicate key as an idempotent no-op without a session', async () => {
  mock.method(XpEventModel, 'updateOne', async () => {
    throw duplicateKey()
  })

  assert.equal(
    await awardXp('user-1', 'event-1', 10, 'lesson_check_pass', 'quiz-1'),
    false,
  )
})

test('awardAchievement propagates a duplicate key when a transaction session is present', async () => {
  mock.method(UserAchievementModel, 'updateOne', async () => {
    throw duplicateKey()
  })

  await assert.rejects(
    awardAchievement('user-1', 'first-check', {} as ClientSession),
    /duplicate key/,
  )
})

test('awardAchievement treats a duplicate key as an idempotent no-op without a session', async () => {
  mock.method(UserAchievementModel, 'updateOne', async () => {
    throw duplicateKey()
  })

  assert.equal(await awardAchievement('user-1', 'first-check'), false)
})
