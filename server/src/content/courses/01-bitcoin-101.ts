import type { CourseBundle } from '../types.js'
import { lessonsA } from './01-bitcoin-101-a.js'
import { lessonsB } from './01-bitcoin-101-b.js'

export const bitcoin101: CourseBundle = {
  course: {
    slug: '01-bitcoin-101',
    title: 'Bitcoin 101',
    description:
      'A beginner-first introduction to Bitcoin: why it exists, what it is, what it is not, and how to stay safe while learning.',
    level: 'Beginner',
    order: 1,
    estimatedMinutes: 53,
    modules: [
      { slug: 'why-bitcoin-exists', title: 'Why Bitcoin exists', order: 1 },
      { slug: 'how-it-is-different', title: 'How Bitcoin is different', order: 2 },
      { slug: 'staying-safe-basics', title: 'Staying safe: the basics', order: 3 },
      { slug: 'next-steps', title: 'Your next steps', order: 4 },
    ],
  },
  lessons: [...lessonsA, ...lessonsB],
}
