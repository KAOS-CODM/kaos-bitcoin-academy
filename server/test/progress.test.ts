import assert from 'node:assert/strict'
import test from 'node:test'
import { summarizeCourse, summarizeOverall } from '../src/lib/progress.js'

test('an untouched course starts at zero with its first lesson as next', () => {
  const summary = summarizeCourse(['a', 'b', 'c'], new Set())
  assert.deepEqual(summary, {
    totalLessons: 3,
    completedLessons: 0,
    percent: 0,
    nextLessonSlug: 'a',
  })
})

test('completion counts only lessons in the course', () => {
  const summary = summarizeCourse(['a', 'b', 'c', 'd'], new Set(['b', 'd', 'outside']))
  assert.equal(summary.completedLessons, 2)
  assert.equal(summary.totalLessons, 4)
  assert.equal(summary.percent, 50)
  assert.equal(summary.nextLessonSlug, 'a')
})

test('next lesson follows course order, not completion order', () => {
  const summary = summarizeCourse(['a', 'b', 'c'], new Set(['a', 'c']))
  assert.equal(summary.nextLessonSlug, 'b')
  assert.equal(summary.percent, 67)
})

test('a complete course has no next lesson and reports 100 percent', () => {
  const summary = summarizeCourse(['a', 'b'], new Set(['a', 'b']))
  assert.equal(summary.nextLessonSlug, null)
  assert.equal(summary.percent, 100)
})

test('empty courses do not divide by zero', () => {
  assert.deepEqual(summarizeCourse([], new Set()), {
    totalLessons: 0,
    completedLessons: 0,
    percent: 0,
    nextLessonSlug: null,
  })
})

test('overall progress aggregates course summaries', () => {
  const overall = summarizeOverall([
    summarizeCourse(['a', 'b'], new Set(['a'])),
    summarizeCourse(['c', 'd'], new Set()),
  ])
  assert.deepEqual(overall, { totalLessons: 4, completedLessons: 1, percent: 25 })
})
