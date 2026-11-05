import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
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
import { QuizModel } from '../src/models/Quiz.js'
import { QuizAttemptModel } from '../src/models/QuizAttempt.js'
import { XpEventModel } from '../src/models/XpEvent.js'
import { AchievementModel } from '../src/models/Achievement.js'
import { UserAchievementModel } from '../src/models/UserAchievement.js'
import { achievements, quizzes } from '../src/content/index.js'
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
  let carol: TestClient
  let aliceId = ''
  let carolId = ''
  const suffix = Date.now().toString(36)

  function quizFor(slug: string) {
    const quiz = quizzes.find((item) => item.slug === slug)
    assert.ok(quiz, `quiz ${slug} should exist`)
    return quiz
  }

  function answersFor(slug: string, correct = true) {
    return quizFor(slug).questions.map((question) => ({
      questionId: question.id,
      optionId: correct
        ? question.correctOptionId
        : (question.options.find((option) => option.id !== question.correctOptionId)?.id ??
          question.options[0]?.id ??
          ''),
    }))
  }

  function attemptBody(slug: string, attemptKey: string, correct = true) {
    return { attemptKey, answers: answersFor(slug, correct) }
  }

  async function registerLearner(name: string): Promise<{ client: TestClient; id: string }> {
    const client = new TestClient(server.baseUrl)
    const register = await client.postJson('/api/auth/register', {
      email: `${name}-${suffix}@example.com`,
      password: 'a long enough password',
      displayName: name,
    })
    assert.equal(register.status, 201)
    const body = (await register.json()) as { user: { id: string } }
    return { client, id: body.user.id }
  }

  function bitcoin101LessonSlugs() {
    return quizzes
      .filter((quiz) => quiz.kind === 'lesson' && quiz.courseSlug === '01-bitcoin-101')
      .map((quiz) => quiz.lessonSlug)
      .filter((slug): slug is string => Boolean(slug))
  }

  before(async () => {
    await connectDatabase(uri as string, databaseName)

    const connectedDatabase = mongoose.connection.db?.databaseName
    if (connectedDatabase !== 'kaos_academy_test') {
      throw new Error(
        `Refusing database test writes: connected to "${connectedDatabase ?? 'unknown'}", expected "kaos_academy_test".`,
      )
    }

    await ensureIndexes()
    await Promise.all([
      UserAchievementModel.deleteMany({}),
      XpEventModel.deleteMany({}),
      QuizAttemptModel.deleteMany({}),
      AchievementModel.deleteMany({}),
      QuizModel.deleteMany({}),
      ProgressModel.deleteMany({}),
      UserModel.deleteMany({}),
      CourseModel.deleteMany({}),
      LessonModel.deleteMany({}),
      mongoose.connection.collection('sessions').deleteMany({}),
    ])
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

      await UserAchievementModel.deleteMany({})
      await XpEventModel.deleteMany({})
      await QuizAttemptModel.deleteMany({})
      await AchievementModel.deleteMany({})
      await QuizModel.deleteMany({})
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
    assert.equal(result.seededQuizzes, 30)
    assert.equal(result.seededAchievements, 3)
    assert.equal(result.storedCourses, 8)
    assert.equal(result.storedLessons, 22)
    assert.equal(result.storedQuizzes, 30)
    assert.equal(result.storedAchievements, 3)
    assert.equal(result.previewLessons, 1)

    assert.equal(await CourseModel.countDocuments(), 8)
    assert.equal(await LessonModel.countDocuments(), 22)
    assert.equal(await QuizModel.countDocuments({ status: 'published' }), 30)
    assert.equal(await AchievementModel.countDocuments({ status: 'published' }), 3)

    const indexes = await ProgressModel.collection.indexes()
    const unique = indexes.find((index) => index.name === 'progress_user_lesson_unique')
    assert.ok(unique, 'compound unique progress index should exist')
    assert.equal(unique?.unique, true)

    const quizIndexes = await QuizModel.collection.indexes()
    assert.equal(
      quizIndexes.find((index) => index.name === 'quizzes_slug_unique')?.unique,
      true,
    )
    const attemptIndexes = await QuizAttemptModel.collection.indexes()
    assert.equal(
      attemptIndexes.find((index) => index.name === 'quiz_attempts_user_quiz_key_unique')
        ?.unique,
      true,
    )
    const xpIndexes = await XpEventModel.collection.indexes()
    assert.equal(
      xpIndexes.find((index) => index.name === 'xp_events_user_key_unique')?.unique,
      true,
    )
    const achievementIndexes = await UserAchievementModel.collection.indexes()
    assert.equal(
      achievementIndexes.find(
        (index) => index.name === 'user_achievements_user_slug_unique',
      )?.unique,
      true,
    )

    const preview = await LessonModel.findOne({ isPreview: true }).lean()
    assert.equal(preview?.slug, 'btc101-what-is-bitcoin')
  })

  test('stale achievements and user history are preserved while stale quizzes are drafted', async () => {
    const authoredFirstCheck = achievements.find(
      (achievement) => achievement.slug === 'first-check',
    )
    assert.ok(authoredFirstCheck)
    const originalFirstCheck = await AchievementModel.findOne({ slug: 'first-check' }).lean()
    assert.ok(originalFirstCheck)

    const staleAchievement = await AchievementModel.create({
      slug: 'legacy-achievement',
      title: 'Legacy achievement',
      description: 'Preserve this stale definition.',
      order: 99,
      status: 'published',
    })
    const historyUserId = new mongoose.Types.ObjectId()
    const earnedAt = new Date('2025-01-02T03:04:05.000Z')
    const history = await UserAchievementModel.create({
      userId: historyUserId,
      achievementSlug: 'legacy-achievement',
      earnedAt,
    })
    const staleQuiz = await QuizModel.create({
      slug: 'legacy-stale-quiz',
      kind: 'lesson',
      courseSlug: '01-bitcoin-101',
      lessonSlug: 'btc101-money-problem',
      title: 'Legacy stale quiz',
      passingScore: 67,
      status: 'published',
      version: 1,
      questions: [],
    })
    const attempt = await QuizAttemptModel.create({
      userId: historyUserId,
      quizId: staleQuiz._id,
      quizSlug: 'legacy-stale-quiz',
      quizVersion: 1,
      courseSlug: '01-bitcoin-101',
      lessonSlug: 'btc101-money-problem',
      attemptKey: randomUUID(),
      answers: [{ questionId: 'q1', selectedOptionId: 'a', correct: false }],
      feedback: [
        {
          questionId: 'q1',
          selectedOptionId: 'a',
          correctOptionId: 'b',
          correct: false,
          explanation: 'Legacy explanation.',
        },
      ],
      score: 0,
      total: 1,
      percent: 0,
      passed: false,
      completedAt: new Date('2025-01-02T03:05:00.000Z'),
    })

    try {
      await AchievementModel.updateOne(
        { slug: 'first-check' },
        {
          $set: {
            title: 'Outdated title',
            description: 'Outdated description.',
            order: 99,
            status: 'draft',
          },
        },
      )

      const result = await seedContent()
      assert.equal(result.seededAchievements, 3)
      assert.equal(result.storedAchievements, 4)

      const refreshedFirstCheck = await AchievementModel.findOne({
        slug: 'first-check',
      }).lean()
      assert.ok(refreshedFirstCheck)
      assert.equal(refreshedFirstCheck.title, authoredFirstCheck.title)
      assert.equal(refreshedFirstCheck.description, authoredFirstCheck.description)
      assert.equal(refreshedFirstCheck.order, authoredFirstCheck.order)
      assert.equal(refreshedFirstCheck.status, 'published')

      const preservedStaleAchievement = await AchievementModel.findById(
        staleAchievement._id,
      ).lean()
      assert.ok(preservedStaleAchievement)
      assert.equal(preservedStaleAchievement.title, 'Legacy achievement')
      assert.equal(preservedStaleAchievement.description, 'Preserve this stale definition.')
      assert.equal(preservedStaleAchievement.order, 99)
      assert.equal(preservedStaleAchievement.status, 'published')
      assert.equal(
        preservedStaleAchievement.updatedAt.toISOString(),
        staleAchievement.updatedAt.toISOString(),
      )

      const preservedHistory = await UserAchievementModel.findById(history._id).lean()
      assert.ok(preservedHistory)
      assert.equal(String(preservedHistory.userId), String(historyUserId))
      assert.equal(preservedHistory.achievementSlug, 'legacy-achievement')
      assert.equal(preservedHistory.earnedAt.toISOString(), earnedAt.toISOString())

      const draftedQuiz = await QuizModel.findById(staleQuiz._id).lean()
      assert.ok(draftedQuiz)
      assert.equal(draftedQuiz.status, 'draft')
      assert.equal(draftedQuiz.title, 'Legacy stale quiz')

      const preservedAttempt = await QuizAttemptModel.findById(attempt._id).lean()
      assert.ok(preservedAttempt)
      assert.equal(String(preservedAttempt.quizId), String(staleQuiz._id))
      assert.equal(preservedAttempt.quizSlug, 'legacy-stale-quiz')
      assert.equal(preservedAttempt.attemptKey, attempt.attemptKey)
    } finally {
      await UserAchievementModel.deleteOne({ _id: history._id })
      await QuizAttemptModel.deleteOne({ _id: attempt._id })
      await QuizModel.deleteOne({ _id: staleQuiz._id })
      await AchievementModel.deleteOne({ _id: staleAchievement._id })
      await AchievementModel.updateOne(
        { _id: originalFirstCheck._id },
        {
          $set: {
            title: originalFirstCheck.title,
            description: originalFirstCheck.description,
            order: originalFirstCheck.order,
            status: originalFirstCheck.status,
          },
        },
      )
    }
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
  test('quiz access policy protects non-preview and draft content', async () => {
    const guest = new TestClient(server.baseUrl)
    const previewSlug = 'btc101-what-is-bitcoin-check'
    const lockedSlug = 'btc101-money-problem-check'

    const preview = await guest.get(`/api/quizzes/${previewSlug}`)
    assert.equal(preview.status, 200)
    assert.equal(preview.headers.get('cache-control'), 'private, no-store')
    assert.match(preview.headers.get('vary') ?? '', /Cookie/i)
    const previewText = await preview.text()
    assert.equal(previewText.includes('correctOptionId'), false)
    assert.equal(previewText.includes('"explanation"'), false)
    const previewBody = JSON.parse(previewText) as {
      quiz: { slug: string; questions: unknown[] }
      viewer: { authenticated: boolean }
      attemptSummary: unknown
    }
    assert.equal(previewBody.quiz.slug, previewSlug)
    assert.ok(previewBody.quiz.questions.length > 0)
    assert.equal(previewBody.viewer.authenticated, false)
    assert.equal(previewBody.attemptSummary, null)

    const locked = await guest.get(`/api/quizzes/${lockedSlug}`)
    assert.equal(locked.status, 401)

    const before = await QuizAttemptModel.countDocuments({ quizSlug: previewSlug })
    const anonymousAttempt = await guest.postJson(
      `/api/quizzes/${previewSlug}/attempts`,
      attemptBody(previewSlug, randomUUID()),
    )
    assert.equal(anonymousAttempt.status, 401)
    assert.equal(await QuizAttemptModel.countDocuments({ quizSlug: previewSlug }), before)

    const anonymousResults = await guest.get(`/api/quizzes/${previewSlug}/results`)
    assert.equal(anonymousResults.status, 401)

    await QuizModel.create([
      {
        slug: 's2-draft-quiz',
        kind: 'course',
        courseSlug: '01-bitcoin-101',
        title: 'Draft quiz',
        passingScore: 80,
        status: 'draft',
        version: 1,
        questions: [],
      },
      {
        slug: 's2-orphan-quiz',
        kind: 'lesson',
        courseSlug: '01-bitcoin-101',
        lessonSlug: 'missing-lesson',
        title: 'Orphan quiz',
        passingScore: 67,
        status: 'published',
        version: 1,
        questions: [],
      },
    ])

    try {
      const draft = await guest.get('/api/quizzes/s2-draft-quiz')
      assert.equal(draft.status, 404)
      const orphan = await guest.get('/api/quizzes/s2-orphan-quiz')
      assert.equal(orphan.status, 404)
    } finally {
      await QuizModel.deleteMany({ slug: { $in: ['s2-draft-quiz', 's2-orphan-quiz'] } })
    }
  })

  test('authenticated attempts are scored, idempotent and isolated by learner', async () => {
    carol = new TestClient(server.baseUrl)
    const email = `carol-${suffix}@example.com`
    const register = await carol.postJson('/api/auth/register', {
      email,
      password: 'a long enough password',
      displayName: 'Carol',
    })
    assert.equal(register.status, 201)
    const registerBody = (await register.json()) as { user: { id: string } }
    carolId = registerBody.user.id

    const slug = 'btc101-what-is-bitcoin-check'
    const authenticatedGet = await carol.get(`/api/quizzes/${slug}`)
    assert.equal(authenticatedGet.status, 200)
    const authenticatedBody = (await authenticatedGet.json()) as {
      viewer: { authenticated: boolean }
      attemptSummary: unknown
    }
    assert.equal(authenticatedBody.viewer.authenticated, true)
    assert.equal(authenticatedBody.attemptSummary, null)

    const attemptKey = randomUUID()
    const first = await carol.postJson(
      `/api/quizzes/${slug}/attempts`,
      attemptBody(slug, attemptKey),
    )
    assert.equal(first.status, 201)
    assert.equal(first.headers.get('cache-control'), 'private, no-store')
    const firstBody = (await first.json()) as {
      replayed: boolean
      score: number
      total: number
      percent: number
      passed: boolean
      xpAwarded: number
      totalXp: number
      feedback: Array<{ correctOptionId: string; explanation: string; correct: boolean }>
      achievementsAwarded: Array<{ slug: string; title: string }>
    }
    assert.equal(firstBody.replayed, false)
    assert.equal(firstBody.score, 2)
    assert.equal(firstBody.total, 2)
    assert.equal(firstBody.percent, 100)
    assert.equal(firstBody.passed, true)
    assert.equal(firstBody.xpAwarded, 10)
    assert.equal(firstBody.totalXp, 10)
    assert.ok(firstBody.feedback.every((feedback) => feedback.correctOptionId && feedback.explanation))
    assert.deepEqual(
      firstBody.achievementsAwarded.map((achievement) => achievement.slug),
      ['first-check'],
    )

    assert.equal(await QuizAttemptModel.countDocuments({ userId: carolId, quizSlug: slug }), 1)
    assert.equal(
      await XpEventModel.countDocuments({
        userId: carolId,
        eventKey: `lesson-check-pass:${slug}`,
      }),
      1,
    )
    assert.equal(
      await UserAchievementModel.countDocuments({
        userId: carolId,
        achievementSlug: 'first-check',
      }),
      1,
    )

    const replay = await carol.postJson(
      `/api/quizzes/${slug}/attempts`,
      attemptBody(slug, attemptKey),
    )
    assert.equal(replay.status, 200)
    const replayBody = (await replay.json()) as {
      replayed: boolean
      xpAwarded: number
      totalXp: number
    }
    assert.equal(replayBody.replayed, true)
    assert.equal(replayBody.xpAwarded, 0)
    assert.equal(replayBody.totalXp, 10)
    assert.equal(await QuizAttemptModel.countDocuments({ userId: carolId, quizSlug: slug }), 1)

    const reused = await carol.postJson(
      `/api/quizzes/${slug}/attempts`,
      attemptBody(slug, attemptKey, false),
    )
    assert.equal(reused.status, 409)
    const reusedBody = (await reused.json()) as { error: { code: string } }
    assert.equal(reusedBody.error.code, 'ATTEMPT_KEY_REUSED')

    const concurrentKey = randomUUID()
    const [concurrentA, concurrentB] = await Promise.all([
      carol.postJson(`/api/quizzes/${slug}/attempts`, attemptBody(slug, concurrentKey)),
      carol.postJson(`/api/quizzes/${slug}/attempts`, attemptBody(slug, concurrentKey)),
    ])
    assert.deepEqual(
      [concurrentA.status, concurrentB.status].sort((a, b) => a - b),
      [200, 201],
    )
    assert.equal(await QuizAttemptModel.countDocuments({ userId: carolId, quizSlug: slug }), 2)
    assert.equal(
      await XpEventModel.countDocuments({
        userId: carolId,
        eventKey: `lesson-check-pass:${slug}`,
      }),
      1,
    )
    assert.equal(
      await UserAchievementModel.countDocuments({
        userId: carolId,
        achievementSlug: 'first-check',
      }),
      1,
    )

    // Different attempt keys can pass at the same time. The attempt and reward
    // transaction must retry the losing reward-index race without a 500 or a
    // second XP event.
    const differentKeys = [randomUUID(), randomUUID()]
    const [differentA, differentB] = await Promise.all([
      carol.postJson(`/api/quizzes/${slug}/attempts`, attemptBody(slug, differentKeys[0])),
      carol.postJson(`/api/quizzes/${slug}/attempts`, attemptBody(slug, differentKeys[1])),
    ])
    assert.deepEqual([differentA.status, differentB.status], [201, 201])
    assert.equal(await QuizAttemptModel.countDocuments({ userId: carolId, quizSlug: slug }), 4)
    assert.equal(
      await XpEventModel.countDocuments({
        userId: carolId,
        eventKey: `lesson-check-pass:${slug}`,
      }),
      1,
    )
    assert.equal(
      await UserAchievementModel.countDocuments({
        userId: carolId,
        achievementSlug: 'first-check',
      }),
      1,
    )

    const invalidBodies = [
      { attemptKey: randomUUID(), answers: [] },
      { attemptKey: randomUUID(), answers: [{ questionId: 'q1', optionId: 'a' }] },
      {
        attemptKey: randomUUID(),
        answers: [
          ...answersFor(slug),
          { questionId: 'unknown', optionId: 'a' },
        ],
      },
      { attemptKey: randomUUID(), answers: answersFor(slug).map((answer, index) => (index === 0 ? { ...answer, optionId: 'unknown' } : answer)) },
      { attemptKey: 'not-a-uuid', answers: answersFor(slug) },
      { attemptKey: randomUUID(), answers: answersFor(slug), score: 100 },
    ]
    for (const invalid of invalidBodies) {
      const response = await carol.postJson(`/api/quizzes/${slug}/attempts`, invalid)
      assert.equal(response.status, 400)
    }
    assert.equal(await QuizAttemptModel.countDocuments({ userId: carolId, quizSlug: slug }), 4)

    const results = await carol.get(`/api/quizzes/${slug}/results`)
    assert.equal(results.status, 200)
    assert.equal(results.headers.get('cache-control'), 'private, no-store')
    const resultsBody = (await results.json()) as {
      attempts: Array<{ feedback: unknown[] }>
      passed: boolean
      bestPercent: number
    }
    assert.equal(resultsBody.attempts.length, 4)
    assert.equal(resultsBody.passed, true)
    assert.equal(resultsBody.bestPercent, 100)
    assert.ok(resultsBody.attempts.every((attempt) => attempt.feedback.length === 2))

    const bobResults = await bob.get(`/api/quizzes/${slug}/results`)
    assert.equal(bobResults.status, 200)
    const bobResultsBody = (await bobResults.json()) as { attempts: unknown[] }
    assert.equal(bobResultsBody.attempts.length, 0)
  })

  test('same attempt key with concurrent different answers returns one attempt and 409', async () => {
    const dave = await registerLearner('dave')
    const slug = 'btc101-what-is-bitcoin-check'
    const attemptKey = randomUUID()
    const correctAnswers = answersFor(slug, true)
    const incorrectAnswers = answersFor(slug, false)
    assert.notDeepEqual(correctAnswers, incorrectAnswers)

    const [first, second] = await Promise.all([
      dave.client.postJson(`/api/quizzes/${slug}/attempts`, {
        attemptKey,
        answers: correctAnswers,
      }),
      dave.client.postJson(`/api/quizzes/${slug}/attempts`, {
        attemptKey,
        answers: incorrectAnswers,
      }),
    ])

    assert.deepEqual(
      [first.status, second.status].sort((a, b) => a - b),
      [201, 409],
    )
    const conflict = first.status === 409 ? first : second
    const conflictBody = (await conflict.json()) as { error: { code: string } }
    assert.equal(conflictBody.error.code, 'ATTEMPT_KEY_REUSED')

    assert.equal(
      await QuizAttemptModel.countDocuments({ userId: dave.id, quizSlug: slug }),
      1,
    )
    const stored = await QuizAttemptModel.findOne({ userId: dave.id, quizSlug: slug }).lean()
    assert.ok(stored)
    assert.equal(stored.attemptKey, attemptKey)

    const storedAnswers = stored.answers.map((answer) => ({
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId,
    }))
    const asStoredShape = (answers: Array<{ questionId: string; optionId: string }>) =>
      answers.map((answer) => ({
        questionId: answer.questionId,
        selectedOptionId: answer.optionId,
      }))
    const retainedCorrect =
      JSON.stringify(storedAnswers) === JSON.stringify(asStoredShape(correctAnswers))
    const retainedIncorrect =
      JSON.stringify(storedAnswers) === JSON.stringify(asStoredShape(incorrectAnswers))
    assert.equal(retainedCorrect || retainedIncorrect, true)

    const xpCount = await XpEventModel.countDocuments({
      userId: dave.id,
      eventKey: `lesson-check-pass:${slug}`,
    })
    const achievementCount = await UserAchievementModel.countDocuments({
      userId: dave.id,
      achievementSlug: 'first-check',
    })
    assert.equal(xpCount, stored.passed ? 1 : 0)
    assert.equal(achievementCount, stored.passed ? 1 : 0)

    const retainedAnswers = stored.passed ? correctAnswers : incorrectAnswers
    const replay = await dave.client.postJson(`/api/quizzes/${slug}/attempts`, {
      attemptKey,
      answers: retainedAnswers,
    })
    assert.equal(replay.status, 200)
    const replayBody = (await replay.json()) as { replayed: boolean; xpAwarded: number }
    assert.equal(replayBody.replayed, true)
    assert.equal(replayBody.xpAwarded, 0)
    assert.equal(
      await QuizAttemptModel.countDocuments({ userId: dave.id, quizSlug: slug }),
      1,
    )
    assert.equal(
      await XpEventModel.countDocuments({
        userId: dave.id,
        eventKey: `lesson-check-pass:${slug}`,
      }),
      xpCount,
    )
    assert.equal(
      await UserAchievementModel.countDocuments({
        userId: dave.id,
        achievementSlug: 'first-check',
      }),
      achievementCount,
    )
  })

  test('course completion requires both lessons and assessment in either order', async () => {
    const assessmentSlug = 'btc101-assessment'
    const lessonSlugs = bitcoin101LessonSlugs()
    assert.equal(lessonSlugs.length, 8)

    const guestCourse = await new TestClient(server.baseUrl).get('/api/courses/01-bitcoin-101')
    assert.equal(guestCourse.status, 200)
    const guestCourseBody = (await guestCourse.json()) as {
      complete: boolean
      assessment: { title: string; questionCount: number; attempts: null; passed: null } | null
    }
    assert.equal(guestCourseBody.complete, false)
    assert.equal(guestCourseBody.assessment?.title, 'Bitcoin 101 assessment')
    assert.equal(guestCourseBody.assessment?.questionCount, 8)
    assert.equal(guestCourseBody.assessment?.attempts, null)
    assert.equal(guestCourseBody.assessment?.passed, null)

    // Carol: pass the assessment first. The course must still be incomplete.
    const carolCourseBefore = await carol.get('/api/courses/01-bitcoin-101')
    const carolCourseBeforeBody = (await carolCourseBefore.json()) as {
      complete: boolean
      assessment: { passed: boolean; attempts: number } | null
    }
    assert.equal(carolCourseBeforeBody.complete, false)
    assert.equal(carolCourseBeforeBody.assessment?.passed, false)
    assert.equal(carolCourseBeforeBody.assessment?.attempts, 0)

    const carolCatalogueBefore = await carol.get('/api/courses')
    const carolCatalogueBeforeBody = (await carolCatalogueBefore.json()) as {
      courses: Array<{
        slug: string
        complete: boolean
        assessment: { passed: boolean; attempts: number; bestPercent: number } | null
      }>
    }
    const carolCatalogueBeforeCourse = carolCatalogueBeforeBody.courses.find(
      (course) => course.slug === '01-bitcoin-101',
    )
    assert.equal(carolCatalogueBeforeCourse?.complete, false)
    assert.equal(carolCatalogueBeforeCourse?.assessment?.passed, false)
    assert.equal(carolCatalogueBeforeCourse?.assessment?.attempts, 0)
    assert.equal(carolCatalogueBeforeCourse?.assessment?.bestPercent, 0)

    const assessmentKey = randomUUID()
    const carolAssessment = await carol.postJson(
      `/api/quizzes/${assessmentSlug}/attempts`,
      attemptBody(assessmentSlug, assessmentKey),
    )
    assert.equal(carolAssessment.status, 201)
    const carolAssessmentBody = (await carolAssessment.json()) as {
      passed: boolean
      xpAwarded: number
      achievementsAwarded: Array<{ slug: string }>
    }
    assert.equal(carolAssessmentBody.passed, true)
    assert.equal(carolAssessmentBody.xpAwarded, 25)
    assert.equal(
      carolAssessmentBody.achievementsAwarded.some(
        (achievement) => achievement.slug === 'first-assessment',
      ),
      true,
    )
    assert.equal(
      carolAssessmentBody.achievementsAwarded.some(
        (achievement) => achievement.slug === 'first-course',
      ),
      false,
    )

    const carolCourseAssessmentOnly = await carol.get('/api/courses/01-bitcoin-101')
    const carolCourseAssessmentOnlyBody = (await carolCourseAssessmentOnly.json()) as {
      complete: boolean
      assessment: { passed: boolean; attempts: number; bestPercent: number } | null
    }
    assert.equal(carolCourseAssessmentOnlyBody.complete, false)
    assert.equal(carolCourseAssessmentOnlyBody.assessment?.passed, true)
    assert.equal(carolCourseAssessmentOnlyBody.assessment?.attempts, 1)
    assert.equal(carolCourseAssessmentOnlyBody.assessment?.bestPercent, 100)

    const carolCatalogueAssessmentOnly = await carol.get('/api/courses')
    const carolCatalogueAssessmentOnlyBody = (await carolCatalogueAssessmentOnly.json()) as {
      courses: Array<{
        slug: string
        complete: boolean
        assessment: { passed: boolean; attempts: number; bestPercent: number } | null
      }>
    }
    const carolCatalogueAssessmentOnlyCourse = carolCatalogueAssessmentOnlyBody.courses.find(
      (course) => course.slug === '01-bitcoin-101',
    )
    assert.equal(carolCatalogueAssessmentOnlyCourse?.complete, false)
    assert.equal(carolCatalogueAssessmentOnlyCourse?.assessment?.passed, true)
    assert.equal(carolCatalogueAssessmentOnlyCourse?.assessment?.attempts, 1)
    assert.equal(carolCatalogueAssessmentOnlyCourse?.assessment?.bestPercent, 100)

    const carolDashboardAssessmentOnly = await carol.get('/api/dashboard')
    const carolDashboardAssessmentOnlyBody = (await carolDashboardAssessmentOnly.json()) as {
      overall: { coursesComplete: number }
      resume: { lesson: unknown; assessment: { passed: boolean } | null } | null
      courses: Array<{ slug: string; complete: boolean; assessment: { passed: boolean } | null }>
    }
    assert.equal(carolDashboardAssessmentOnlyBody.overall.coursesComplete, 0)
    assert.equal(
      carolDashboardAssessmentOnlyBody.courses.find((course) => course.slug === '01-bitcoin-101')
        ?.complete,
      false,
    )
    assert.equal(
      carolDashboardAssessmentOnlyBody.courses.find((course) => course.slug === '01-bitcoin-101')
        ?.assessment?.passed,
      true,
    )
    assert.equal(carolDashboardAssessmentOnlyBody.resume?.assessment?.passed, true)

    let lastCarolCompletion: {
      complete: boolean
      xpAwarded: number
      achievementsAwarded: Array<{ slug: string }>
    } | null = null
    for (const lessonSlug of lessonSlugs) {
      const response = await carol.postJson(
        `/api/progress/lessons/${lessonSlug}/complete`,
        {},
      )
      assert.equal(response.status, 201)
      lastCarolCompletion = (await response.json()) as typeof lastCarolCompletion
      if (lessonSlug !== lessonSlugs[lessonSlugs.length - 1]) {
        assert.equal(lastCarolCompletion?.xpAwarded, 0)
      }
    }
    assert.equal(lastCarolCompletion?.complete, true)
    assert.equal(lastCarolCompletion?.xpAwarded, 50)
    assert.equal(
      lastCarolCompletion?.achievementsAwarded.some(
        (achievement) => achievement.slug === 'first-course',
      ),
      true,
    )

    const carolCourseComplete = await carol.get('/api/courses/01-bitcoin-101')
    const carolCourseCompleteBody = (await carolCourseComplete.json()) as {
      complete: boolean
      progress: { completedLessons: number; totalLessons: number }
      assessment: { passed: boolean } | null
    }
    assert.equal(carolCourseCompleteBody.complete, true)
    assert.equal(carolCourseCompleteBody.progress.completedLessons, 8)
    assert.equal(carolCourseCompleteBody.progress.totalLessons, 8)
    assert.equal(carolCourseCompleteBody.assessment?.passed, true)

    const carolDashboardComplete = await carol.get('/api/dashboard')
    const carolDashboardCompleteBody = (await carolDashboardComplete.json()) as {
      overall: { coursesComplete: number; coursesTotal: number }
      xp: { total: number }
      achievements: Array<{ slug: string }>
      courses: Array<{ slug: string; complete: boolean }>
    }
    assert.equal(carolDashboardCompleteBody.overall.coursesComplete, 1)
    assert.equal(carolDashboardCompleteBody.overall.coursesTotal, 8)
    assert.equal(
      carolDashboardCompleteBody.courses.find((course) => course.slug === '01-bitcoin-101')
        ?.complete,
      true,
    )
    assert.equal(carolDashboardCompleteBody.xp.total, 85)
    assert.deepEqual(
      carolDashboardCompleteBody.achievements.map((achievement) => achievement.slug).sort(),
      ['first-assessment', 'first-check', 'first-course'],
    )

    // Alice: complete the lessons first. The course must still be incomplete.
    const aliceRemaining = lessonSlugs.filter((slug) => slug !== 'btc101-money-problem')
    for (const lessonSlug of aliceRemaining) {
      const response = await alice.postJson(
        `/api/progress/lessons/${lessonSlug}/complete`,
        {},
      )
      assert.equal(response.status, 201)
      const body = (await response.json()) as { complete: boolean; xpAwarded: number }
      assert.equal(body.xpAwarded, 0)
      assert.equal(body.complete, false)
    }

    const aliceCourseLessonsOnly = await alice.get('/api/courses/01-bitcoin-101')
    const aliceCourseLessonsOnlyBody = (await aliceCourseLessonsOnly.json()) as {
      complete: boolean
      progress: { completedLessons: number; totalLessons: number }
      assessment: { passed: boolean; attempts: number } | null
    }
    assert.equal(aliceCourseLessonsOnlyBody.complete, false)
    assert.equal(aliceCourseLessonsOnlyBody.progress.completedLessons, 8)
    assert.equal(aliceCourseLessonsOnlyBody.assessment?.passed, false)
    assert.equal(aliceCourseLessonsOnlyBody.assessment?.attempts, 0)

    const aliceAssessmentKey = randomUUID()
    const aliceAssessment = await alice.postJson(
      `/api/quizzes/${assessmentSlug}/attempts`,
      attemptBody(assessmentSlug, aliceAssessmentKey),
    )
    assert.equal(aliceAssessment.status, 201)
    const aliceAssessmentBody = (await aliceAssessment.json()) as {
      passed: boolean
      xpAwarded: number
      totalXp: number
      achievementsAwarded: Array<{ slug: string }>
    }
    assert.equal(aliceAssessmentBody.passed, true)
    assert.equal(aliceAssessmentBody.xpAwarded, 75)
    assert.equal(aliceAssessmentBody.totalXp, 75)
    assert.deepEqual(
      aliceAssessmentBody.achievementsAwarded.map((achievement) => achievement.slug).sort(),
      ['first-assessment', 'first-course'],
    )

    const aliceCourseComplete = await alice.get('/api/courses/01-bitcoin-101')
    const aliceCourseCompleteBody = (await aliceCourseComplete.json()) as {
      complete: boolean
      assessment: { passed: boolean } | null
    }
    assert.equal(aliceCourseCompleteBody.complete, true)
    assert.equal(aliceCourseCompleteBody.assessment?.passed, true)

    const aliceDashboardComplete = await alice.get('/api/dashboard')
    const aliceDashboardCompleteBody = (await aliceDashboardComplete.json()) as {
      overall: { coursesComplete: number }
      courses: Array<{ slug: string; complete: boolean }>
    }
    assert.equal(aliceDashboardCompleteBody.overall.coursesComplete, 1)
    assert.equal(
      aliceDashboardCompleteBody.courses.find((course) => course.slug === '01-bitcoin-101')
        ?.complete,
      true,
    )

    const aliceReplay = await alice.postJson(
      `/api/quizzes/${assessmentSlug}/attempts`,
      attemptBody(assessmentSlug, aliceAssessmentKey),
    )
    assert.equal(aliceReplay.status, 200)
    const aliceReplayBody = (await aliceReplay.json()) as {
      replayed: boolean
      xpAwarded: number
    }
    assert.equal(aliceReplayBody.replayed, true)
    assert.equal(aliceReplayBody.xpAwarded, 0)

    const aliceRetake = await alice.postJson(
      `/api/quizzes/${assessmentSlug}/attempts`,
      attemptBody(assessmentSlug, randomUUID()),
    )
    assert.equal(aliceRetake.status, 201)
    const aliceRetakeBody = (await aliceRetake.json()) as {
      xpAwarded: number
      achievementsAwarded: unknown[]
    }
    assert.equal(aliceRetakeBody.xpAwarded, 0)
    assert.equal(aliceRetakeBody.achievementsAwarded.length, 0)

    assert.equal(
      await XpEventModel.countDocuments({
        userId: aliceId,
        eventKey: `course-assessment-pass:${assessmentSlug}`,
      }),
      1,
    )
    assert.equal(
      await XpEventModel.countDocuments({
        userId: aliceId,
        eventKey: 'course-complete:01-bitcoin-101',
      }),
      1,
    )
  })

  test('concurrent final lesson completion and assessment pass award completion once', async () => {
    const erin = await registerLearner('erin')
    const assessmentSlug = 'btc101-assessment'
    const lessonSlugs = bitcoin101LessonSlugs()
    assert.equal(lessonSlugs.length, 8)

    const finalLesson = lessonSlugs[lessonSlugs.length - 1]
    assert.ok(finalLesson)
    for (const lessonSlug of lessonSlugs.filter((slug) => slug !== finalLesson)) {
      const response = await erin.client.postJson(
        `/api/progress/lessons/${lessonSlug}/complete`,
        {},
      )
      assert.equal(response.status, 201)
      const body = (await response.json()) as { complete: boolean; xpAwarded: number }
      assert.equal(body.complete, false)
      assert.equal(body.xpAwarded, 0)
    }

    const assessmentKey = randomUUID()
    const [lessonResponse, assessmentResponse] = await Promise.all([
      erin.client.postJson(`/api/progress/lessons/${finalLesson}/complete`, {}),
      erin.client.postJson(
        `/api/quizzes/${assessmentSlug}/attempts`,
        attemptBody(assessmentSlug, assessmentKey),
      ),
    ])

    assert.equal(lessonResponse.status, 201)
    assert.equal(assessmentResponse.status, 201)
    const lessonBody = (await lessonResponse.json()) as {
      complete: boolean
      xpAwarded: number
      achievementsAwarded: Array<{ slug: string }>
    }
    const assessmentBody = (await assessmentResponse.json()) as {
      passed: boolean
      xpAwarded: number
      achievementsAwarded: Array<{ slug: string }>
    }
    assert.equal(assessmentBody.passed, true)
    assert.equal(lessonBody.xpAwarded + assessmentBody.xpAwarded, 75)
    assert.equal(
      lessonBody.complete ||
        lessonBody.achievementsAwarded.some(
          (achievement) => achievement.slug === 'first-course',
        ) ||
        assessmentBody.achievementsAwarded.some(
          (achievement) => achievement.slug === 'first-course',
        ),
      true,
    )

    assert.equal(
      await QuizAttemptModel.countDocuments({
        userId: erin.id,
        quizSlug: assessmentSlug,
      }),
      1,
    )
    assert.equal(
      await ProgressModel.countDocuments({ userId: erin.id, courseSlug: '01-bitcoin-101' }),
      8,
    )
    assert.equal(
      await XpEventModel.countDocuments({
        userId: erin.id,
        eventKey: `course-assessment-pass:${assessmentSlug}`,
      }),
      1,
    )
    assert.equal(
      await XpEventModel.countDocuments({
        userId: erin.id,
        eventKey: 'course-complete:01-bitcoin-101',
      }),
      1,
    )
    assert.equal(
      await UserAchievementModel.countDocuments({
        userId: erin.id,
        achievementSlug: 'first-assessment',
      }),
      1,
    )
    assert.equal(
      await UserAchievementModel.countDocuments({
        userId: erin.id,
        achievementSlug: 'first-course',
      }),
      1,
    )

    const course = await erin.client.get('/api/courses/01-bitcoin-101')
    assert.equal(course.status, 200)
    const courseBody = (await course.json()) as {
      complete: boolean
      progress: { completedLessons: number; totalLessons: number }
      assessment: { passed: boolean } | null
    }
    assert.equal(courseBody.complete, true)
    assert.equal(courseBody.progress.completedLessons, 8)
    assert.equal(courseBody.progress.totalLessons, 8)
    assert.equal(courseBody.assessment?.passed, true)

    const dashboard = await erin.client.get('/api/dashboard')
    assert.equal(dashboard.status, 200)
    const dashboardBody = (await dashboard.json()) as {
      xp: { total: number }
      overall: { coursesComplete: number }
      achievements: Array<{ slug: string }>
    }
    assert.equal(dashboardBody.xp.total, 75)
    assert.equal(dashboardBody.overall.coursesComplete, 1)
    assert.deepEqual(
      dashboardBody.achievements.map((achievement) => achievement.slug).sort(),
      ['first-assessment', 'first-course'],
    )

    const assessmentReplay = await erin.client.postJson(
      `/api/quizzes/${assessmentSlug}/attempts`,
      attemptBody(assessmentSlug, assessmentKey),
    )
    assert.equal(assessmentReplay.status, 200)
    const assessmentReplayBody = (await assessmentReplay.json()) as {
      replayed: boolean
      xpAwarded: number
    }
    assert.equal(assessmentReplayBody.replayed, true)
    assert.equal(assessmentReplayBody.xpAwarded, 0)

    const lessonReplay = await erin.client.postJson(
      `/api/progress/lessons/${finalLesson}/complete`,
      {},
    )
    assert.equal(lessonReplay.status, 200)
    const lessonReplayBody = (await lessonReplay.json()) as {
      complete: boolean
      xpAwarded: number
      achievementsAwarded: unknown[]
    }
    assert.equal(lessonReplayBody.complete, true)
    assert.equal(lessonReplayBody.xpAwarded, 0)
    assert.equal(lessonReplayBody.achievementsAwarded.length, 0)

    assert.equal(
      await QuizAttemptModel.countDocuments({
        userId: erin.id,
        quizSlug: assessmentSlug,
      }),
      1,
    )
    assert.equal(
      await XpEventModel.countDocuments({
        userId: erin.id,
        eventKey: 'course-complete:01-bitcoin-101',
      }),
      1,
    )
    assert.equal(
      await UserAchievementModel.countDocuments({
        userId: erin.id,
        achievementSlug: 'first-course',
      }),
      1,
    )
  })

})
