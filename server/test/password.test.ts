import assert from 'node:assert/strict'
import test from 'node:test'
import { hashPassword, verifyPassword } from '../src/lib/password.js'

test('passwords are hashed with argon2id and never stored in clear', async () => {
  const password = 'correct horse battery staple'
  const digest = await hashPassword(password)

  assert.match(digest, /^\$argon2id\$/)
  assert.notEqual(digest, password)
  assert.equal(await verifyPassword(digest, password), true)
  assert.equal(await verifyPassword(digest, 'wrong password'), false)
})

test('the same password produces different hashes (unique salts)', async () => {
  const password = 'another long password'
  const first = await hashPassword(password)
  const second = await hashPassword(password)
  assert.notEqual(first, second)
})

test('malformed digests fail closed rather than throwing', async () => {
  assert.equal(await verifyPassword('not-a-hash', 'anything'), false)
})
