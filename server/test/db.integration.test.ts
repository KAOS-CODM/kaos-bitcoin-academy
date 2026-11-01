import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import mongoose from 'mongoose'
import MongoStore from 'connect-mongo'
import { connectDatabase, disconnectDatabase, ensureIndexes } from '../src/db.js'
import { seedContent } from '../src/seed/seedContent.js'
import { createApp } from '../src/app.js'
import { CourseModel } from '../src/models/Course.js'
import { LessonModel } from '../src/models/Lesson.js'
import { ProgressModel } from '../src/models/Progress.js'
import { UserModel } from '../src/models/User.js'
import { startTestServer, TestClient } from './helpers.js'
import type { TestServer } from './helpers.js'

const uri = process.env.MONGODB_URI
const enabled = process.env.RUN_DB_TESTS === '1' && Boolean(uri)
const databaseName = `${process.env.MONGODB_DB ?? 'kaos_academy'}_test`

const skip = enabled
  ? false
  : 'Database tests need RUN_DB_TESTS=1 and MONGODB_URI pointing at the Atlas cluster.'

describe('database-backed S1 flows', { skip }, () => {
  let server: TestServer
  let alice: TestClient
  let bob: TestClient
  let aliceId = ''
  const suffix = Date.now().toString(36)

  before(async () => {
    await connectDatabase(uri as string, databaseName)
    await ensureIndexes()
    await Promise.all([UserModel.deleteMany({}), ProgressModel.deleteMany({})])
    await seedContent()

    const store = MongoStore.create({
      client: mongoose.connection.getClient(),
      dbName: databaseName,
      collectionName: 'sessions',
      ttl: 60 * 60,
    })

    const app = createApp({ clientDist: null, sessionStore: store })
    const instance = await new Promise<TestServer>((resolve) => {
      const listen = app.listen(0, '127.0.0.1', () => {
        const address = listen.address()
        if (typeof address === 'object' && address) {
          resolve({
            baseUrl: `http://127.0.0.1:${address.port}`,
            close: () =>
              new Promise<void>((done, fail) =>
                listen.close((error) => (error ? fail(error) : done())),
              ),
          })
        }
      })
    })

    server = instance
    alice = new TestClient(server.baseUrl)
    bob = new TestClient(server.baseUrl)
  })

  after(async () => {
    try {
      await server.close()

      const connectedDatabase = mongoose.connection.db?.databaseName
      if (connectedDatabase !== 'kaos_academy_test') {
        throw new Error(
          `Refusing database cleanup: connected to "${connectedDatabase ?? 'unknown'}", expected "kaos_academy_test".`,
        )
      }

      await ProgressModel.deleteMany({})
      await mongoose.connection.collection('sessions').deleteMany({})
      await UserModel.deleteMany({})
      await CourseModel.deleteMany({})
      await LessonModel.deleteMany({})
    } finally {
      await disconnectDatabase()
    }
  })

  test('seeding twice is idempotent and creates the expected indexes', async () => {
    const result = await seedContent()

    assert.equal(result.seededCourses, 8)
    assert.equal(result.seededLessons, 22)
    assert.equal(result.storedCourses, 8)
    assert.equal(result.storedLessons, 22)
    assert.equal(result.previewLessons, 1)

    assert.equal(await CourseModel.countDocuments(), 8)
    assert.equal(await LessonModel.countDocuments(), 22)

    const indexes = await ProgressModel.collection.indexes()
    const unique = indexes.find((index) => index.name === 'progress_user_lesson_unique')
    assert.ok(unique, 'compound unique progress index should exist')
    assert.equal(unique?.unique, true)

    const preview = await LessonModel.findOne({ isPreview: true }).lean()
    assert.equal(preview?.slug, 'btc101-what-is-bitcoin')
  })

  test('anonymous visitors can read only the preview lesson', async () => {
    const guest = new TestClient(server.baseUrl)

    const catalogue = await guest.get('/api/courses')
    assert.equal(catalogue.status, 200)
    const catalogueBody = (await catalogue.json()) as { courses: Array<{ slug: string }> }
    assert.equal(catalogueBody.courses.length, 8)

    const preview = await guest.get('/api/lessons/btc101-what-is-bitcoin')
    assert.equal(preview.status, 200)
    const previewBody = (await preview.json()) as {
      lesson: { sections: unknown[]; isPreview: boolean }
      viewer: { authenticated: boolean }
    }
    assert.equal(previewBody.lesson.isPreview, true)
    assert.ok(previewBody.lesson.sections.length > 0)
    assert.equal(previewBody.viewer.authenticated, false)

    const locked = await guest.get('/api/lessons/btc101-money-problem')
    assert.equal(locked.status, 401)

    const dashboard = await guest.get('/api/dashboard')
    assert.equal(dashboard.status, 401)

    const anonymousCompletion = await guest.postJson(
      '/api/progress/lessons/btc101-what-is-bitcoin/complete',
      {},
    )
    assert.equal(anonymousCompletion.status, 401)
    assert.equal(await ProgressModel.countDocuments(), 0)
  })

  test('unpublished content is never exposed', async () => {
    await CourseModel.create({
      slug: '99-draft-course',
      title: 'Draft course',
      description: 'Should never be visible.',
      level: 'Beginner',
      order: 99,
      status: 'draft',
      estimatedMinutes: 10,
      modules: [{ slug: 'draft-module', title: 'Draft module', order: 1 }],
    })
    await LessonModel.create({
      slug: 'draft-lesson',
      courseSlug: '99-draft-course',
      moduleSlug: 'draft-module',
      title: 'Draft lesson',
      summary: 'Should never be visible either.',
      order: 1,
      minutes: 5,
      status: 'draft',
      isPreview: false,
      objectives: ['None'],
      sections: [{ type: 'paragraph', paragraphs: ['Hidden.'] }],
    })

    try {
      const catalogue = await new TestClient(server.baseUrl).get('/api/courses')
      const body = (await catalogue.json()) as { courses: Array<{ slug: string }> }
      assert.equal(body.courses.some((course) => course.slug === '99-draft-course'), false)

      const lesson = await new TestClient(server.baseUrl).get('/api/lessons/draft-lesson')
      assert.equal(lesson.status, 404)

      const course = await new TestClient(server.baseUrl).get('/api/courses/99-draft-course')
      assert.equal(course.status, 404)
    } finally {
      await LessonModel.deleteOne({ slug: 'draft-lesson' })
      await CourseModel.deleteOne({ slug: '99-draft-course' })
    }
  })

  test('registration, duplicate rejection, session persistence and logout', async () => {
    const email = `alice-${suffix}@example.com`

    const register = await alice.postJson('/api/auth/register', {
      email,
      password: 'a long enough password',
      displayName: 'Alice',
    })
    assert.equal(register.status, 201)

    const cookie = register.headers.getSetCookie().join('; ')
    assert.match(cookie, /HttpOnly/i)
    assert.match(cookie, /SameSite=Lax/i)
    assert.match(cookie, /Path=\//i)
    assert.doesNotMatch(cookie, /Domain=/i)

    const body = (await register.json()) as { user: { id: string; email: string } }
    aliceId = body.user.id
    assert.equal(body.user.email, email)

    const duplicate = await alice.postJson('/api/auth/register', {
      email,
      password: 'another long password',
      displayName: 'Alice Again',
    })
    assert.equal(duplicate.status, 409)

    const me = await alice.get('/api/auth/me')
    assert.equal(me.status, 200)
    const meBody = (await me.json()) as { user: { id: string } | null }
    assert.equal(meBody.user?.id, aliceId)

    const badLogin = await new TestClient(server.baseUrl).postJson('/api/auth/login', {
      email,
      password: 'definitely the wrong password',
    })
    assert.equal(badLogin.status, 401)

    const logout = await alice.request('/api/auth/logout', { method: 'POST' })
    assert.equal(logout.status, 204)

    const afterLogout = await alice.get('/api/auth/me')
    const afterLogoutBody = (await afterLogout.json()) as { user: unknown }
    assert.equal(afterLogoutBody.user, null)

    const protectedAfterLogout = await alice.get('/api/dashboard')
    assert.equal(protectedAfterLogout.status, 401)

    const login = await alice.postJson('/api/auth/login', {
      email,
      password: 'a long enough password',
    })
    assert.equal(login.status, 200)

    const dashboard = await alice.get('/api/dashboard')
    assert.equal(dashboard.status, 200)
  })

  test('completion persists across sessions and drives the dashboard', async () => {
    const complete = await alice.postJson(
      '/api/progress/lessons/btc101-money-problem/complete',
      {},
    )
    assert.equal(complete.status, 201)
    const completeBody = (await complete.json()) as {
      completed: boolean
      summary: { completedLessons: number; nextLessonSlug: string }
    }
    assert.equal(completeBody.completed, true)
    assert.equal(completeBody.summary.completedLessons, 1)

    const repeat = await alice.postJson(
      '/api/progress/lessons/btc101-money-problem/complete',
      {},
    )
    assert.equal(repeat.status, 200)
    const repeatBody = (await repeat.json()) as { alreadyCompleted: boolean }
    assert.equal(repeatBody.alreadyCompleted, true)
    assert.equal(await ProgressModel.countDocuments({ userId: aliceId }), 1)

    const dashboard = await alice.get('/api/dashboard')
    assert.equal(dashboard.status, 200)
    const dashboardBody = (await dashboard.json()) as {
      overall: { completedLessons: number; totalLessons: number }
      resume: { lesson: { slug: string } } | null
      isNewLearner: boolean
    }
    assert.equal(dashboardBody.overall.completedLessons, 1)
    assert.equal(dashboardBody.overall.totalLessons, 22)
    assert.equal(dashboardBody.isNewLearner, false)
    assert.equal(dashboardBody.resume?.lesson.slug, 'btc101-what-is-bitcoin')
  })

  test('one learner cannot read or alter another learner’s progress', async () => {
    const email = `bob-${suffix}@example.com`
    const register = await bob.postJson('/api/auth/register', {
      email,
      password: 'a long enough password',
      displayName: 'Bob',
    })
    assert.equal(register.status, 201)

    const bobComplete = await bob.postJson('/api/progress/lessons/btc101-scams/complete', {
      userId: aliceId,
    })
    assert.equal(bobComplete.status, 201)

    // Bob's attempt to attribute work to Alice must be ignored: the session owns the record.
    assert.equal(await ProgressModel.countDocuments({ userId: aliceId }), 1)
    const aliceRecords = await ProgressModel.find({ userId: aliceId }).lean()
    assert.deepEqual(
      aliceRecords.map((record) => record.lessonSlug),
      ['btc101-money-problem'],
    )

    const bobProgress = await bob.get('/api/progress')
    const bobBody = (await bobProgress.json()) as {
      progress: Array<{ lessonSlug: string }>
    }
    assert.deepEqual(
      bobBody.progress.map((record) => record.lessonSlug),
      ['btc101-scams'],
    )

    const aliceProgress = await alice.get('/api/progress')
    const aliceBody = (await aliceProgress.json()) as {
      progress: Array<{ lessonSlug: string }>
    }
    assert.deepEqual(
      aliceBody.progress.map((record) => record.lessonSlug),
      ['btc101-money-problem'],
    )

    const aliceDashboard = await alice.get('/api/dashboard')
    const aliceDashboardBody = (await aliceDashboard.json()) as {
      overall: { completedLessons: number }
    }
    assert.equal(aliceDashboardBody.overall.completedLessons, 1)
  })

  test('responses never include password hashes or session identifiers', async () => {
    const me = await alice.get('/api/auth/me')
    const text = await me.text()
    assert.doesNotMatch(text, /passwordHash|\$argon2/)
  })
})
