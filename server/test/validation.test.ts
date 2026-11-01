import assert from 'node:assert/strict'
import test from 'node:test'
import { loginSchema, registerSchema } from '../src/schemas/auth.js'

test('registration normalises email case and surrounding whitespace', () => {
  const result = registerSchema.safeParse({
    email: '  Learner@Example.COM ',
    password: 'a long enough password',
    displayName: '  Ada  ',
  })
  assert.equal(result.success, true)
  if (result.success) {
    assert.equal(result.data.email, 'learner@example.com')
    assert.equal(result.data.displayName, 'Ada')
  }
})

test('registration rejects short passwords, bad emails and empty names', () => {
  const shortPassword = registerSchema.safeParse({
    email: 'a@b.co',
    password: 'short',
    displayName: 'Ada',
  })
  assert.equal(shortPassword.success, false)

  const badEmail = registerSchema.safeParse({
    email: 'not-an-email',
    password: 'a long enough password',
    displayName: 'Ada',
  })
  assert.equal(badEmail.success, false)

  const blankName = registerSchema.safeParse({
    email: 'a@b.co',
    password: 'a long enough password',
    displayName: '   ',
  })
  assert.equal(blankName.success, false)
})

test('registration rejects passwords longer than 128 characters', () => {
  const result = registerSchema.safeParse({
    email: 'a@b.co',
    password: 'x'.repeat(129),
    displayName: 'Ada',
  })
  assert.equal(result.success, false)
})

test('login accepts valid credentials and rejects malformed input', () => {
  assert.equal(
    loginSchema.safeParse({ email: 'A@B.co', password: 'x' }).success,
    true,
  )
  assert.equal(loginSchema.safeParse({ email: 'A@B.co', password: '' }).success, false)
  assert.equal(loginSchema.safeParse({ email: 'nope', password: 'x' }).success, false)
})
