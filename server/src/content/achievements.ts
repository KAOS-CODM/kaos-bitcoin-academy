import type { AchievementSeed } from './types.js'

export const achievements: AchievementSeed[] = [
  {
    slug: 'first-check',
    title: 'First Check',
    description: 'Pass any lesson knowledge check.',
    order: 1,
  },
  {
    slug: 'first-assessment',
    title: 'Assessment Passed',
    description: 'Pass any course assessment.',
    order: 2,
  },
  {
    slug: 'first-course',
    title: 'Course Finisher',
    description: 'Complete a course by finishing its lessons and passing its assessment.',
    order: 3,
  },
]
