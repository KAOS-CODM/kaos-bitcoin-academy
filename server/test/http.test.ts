import assert from 'node:assert/strict'
import test from 'node:test'
import type { NextFunction, Request, Response } from 'express'
import { startTestServer, TestClient } from './helpers.js'
import { requireAuth } from '../src/middleware/auth.js'

test('health reports the database state without leaking connection details', async (t) => {
  const server = await startTestServer()
  t.after(() => server.close())

  const response = await fetch(`${server.baseUrl}/api/health`)
  assert.equal(response.status, 200)
  const body = (await response.json()) as Record<string, unknown>
  assert.equal(body.status, 'ok')
  assert.equal(body.db, 'down')
  assert.equal(Object.keys(body).length, 2)
})

test('data routes degrade to a controlled 503 when the database is unavailable', async (t) => {
  const server = await startTestServer()
  t.after(() => server.close())
  const client = new TestClient(server.baseUrl)

  for (const path of [
    '/api/courses',
    '/api/courses/01-bitcoin-101',
    '/api/dashboard',
    '/api/quizzes/btc101-what-is-bitcoin-check',
    '/api/quizzes/btc101-what-is-bitcoin-check/results',
  ]) {
    const response = await client.get(path)
    assert.equal(response.status, 503, path)
    const body = (await response.json()) as { error: { code: string; message: string } }
    assert.equal(body.error.code, 'DB_UNAVAILABLE')
    assert.doesNotMatch(body.error.message, /mongodb|atlas|password|stack/i)
  }

  const register = await client.postJson('/api/auth/register', {
    email: 'learner@example.com',
    password: 'a long enough password',
    displayName: 'Learner',
  })
  assert.equal(register.status, 503)

  const quizAttempt = await client.postJson('/api/quizzes/btc101-what-is-bitcoin-check/attempts', {
    attemptKey: '00000000-0000-4000-8000-000000000000',
    answers: [{ questionId: 'q1', optionId: 'a' }],
  })
  assert.equal(quizAttempt.status, 503)
})

test('the tutor API is mounted and requires authentication', async (t) => {
  const server = await startTestServer()
  t.after(() => server.close())

  const response = await fetch(`${server.baseUrl}/api/tutor/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'What is Bitcoin?' }),
  })
  assert.equal(response.status, 401)
  const body = (await response.json()) as { error: { code: string } }
  assert.equal(body.error.code, 'UNAUTHORIZED')
})

test('unknown API endpoints return a JSON 404, not the SPA', async (t) => {
  const server = await startTestServer()
  t.after(() => server.close())

  const response = await fetch(`${server.baseUrl}/api/does-not-exist`)
  assert.equal(response.status, 404)
  const body = (await response.json()) as { error: { code: string } }
  assert.equal(body.error.code, 'NOT_FOUND')
})

test('cross-origin mutations are rejected before reaching a route', async (t) => {
  const server = await startTestServer()
  t.after(() => server.close())

  const response = await fetch(`${server.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    body: JSON.stringify({ email: 'a@b.co', password: 'x' }),
  })
  assert.equal(response.status, 403)
  const body = (await response.json()) as { error: { code: string } }
  assert.equal(body.error.code, 'ORIGIN_NOT_ALLOWED')
})

test('same-origin mutations pass the origin guard', async (t) => {
  const server = await startTestServer()
  t.after(() => server.close())

  const response = await fetch(`${server.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: server.baseUrl },
    body: JSON.stringify({ email: 'a@b.co', password: 'x' }),
  })
  // Guard allows it; the route then reports the database is unavailable.
  assert.equal(response.status, 503)
})

test('non-JSON mutation bodies are refused', async (t) => {
  const server = await startTestServer()
  t.after(() => server.close())

  const response = await fetch(`${server.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: 'email=a@b.co',
  })
  assert.equal(response.status, 415)
})

test('requireAuth rejects anonymous requests and accepts session users', () => {
  const anonymous = { session: {} } as Request
  let captured: unknown = null
  requireAuth(anonymous, {} as Response, ((error?: unknown) => {
    captured = error
  }) as NextFunction)

  assert.ok(captured instanceof Error)
  assert.match(String((captured as Error & { code?: string }).code), /UNAUTHORIZED/)

  const authenticated = { session: { userId: 'user-1' } } as unknown as Request
  let passed = false
  requireAuth(authenticated, {} as Response, (() => {
    passed = true
  }) as NextFunction)
  assert.equal(passed, true)
})
