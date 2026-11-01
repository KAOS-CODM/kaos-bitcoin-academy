import assert from 'node:assert/strict'
import test from 'node:test'
import { courses, lessons, validateContent } from '../src/content/index.js'

const EXPECTED_COURSES = [
  '01-bitcoin-101',
  '02-money-and-bitcoin',
  '03-how-bitcoin-works',
  '04-bitcoin-wallets',
  '05-using-bitcoin',
  '06-lightning-network',
  '07-staying-safe',
  '08-beyond-bitcoin',
]

test('curriculum passes structural validation', () => {
  assert.deepEqual(validateContent(), [])
})

test('the approved eight courses are present in order', () => {
  assert.deepEqual(
    courses.map((course) => course.slug),
    EXPECTED_COURSES,
  )
})

test('Bitcoin 101 is complete and later courses expose a first module', () => {
  const bitcoin101 = lessons.filter((lesson) => lesson.courseSlug === '01-bitcoin-101')
  assert.equal(bitcoin101.length, 8)
  assert.equal(bitcoin101.filter((lesson) => lesson.isPreview).length, 1)

  for (const course of courses.slice(1)) {
    const courseLessons = lessons.filter((lesson) => lesson.courseSlug === course.slug)
    assert.equal(courseLessons.length, 2, `${course.slug} should have two authored lessons`)
    assert.equal(course.modules.length, 1, `${course.slug} should declare one module`)
    assert.equal(courseLessons[0]?.moduleSlug, course.modules[0]?.slug)
    assert.equal(courseLessons[1]?.moduleSlug, course.modules[0]?.slug)
  }
})

test('exactly one preview lesson is designated, from Bitcoin 101', () => {
  const previews = lessons.filter((lesson) => lesson.isPreview)
  assert.equal(previews.length, 1)
  assert.equal(previews[0]?.slug, 'btc101-what-is-bitcoin')
  assert.equal(previews[0]?.courseSlug, '01-bitcoin-101')
})

test('every lesson carries objectives and substantial readable content', () => {
  for (const lesson of lessons) {
    assert.ok(lesson.objectives.length >= 2, `${lesson.slug} needs at least two objectives`)

    const characters = lesson.sections
      .flatMap((section) => [...(section.paragraphs ?? []), ...(section.items ?? [])])
      .join(' ')
      .length
    assert.ok(characters >= 800, `${lesson.slug} has too little body content (${characters})`)

    assert.ok(lesson.minutes >= 3 && lesson.minutes <= 30, `${lesson.slug} has an odd duration`)
    assert.ok(lesson.summary.length > 40, `${lesson.slug} needs a useful summary`)
  }
})

test('lesson slugs and course lesson orders are unique', () => {
  const slugs = lessons.map((lesson) => lesson.slug)
  assert.equal(new Set(slugs).size, slugs.length)

  for (const course of courses) {
    const orders = lessons
      .filter((lesson) => lesson.courseSlug === course.slug)
      .map((lesson) => lesson.order)
    assert.equal(new Set(orders).size, orders.length, `${course.slug} repeats a lesson order`)
  }
})
