export interface CourseProgress {
  totalLessons: number
  completedLessons: number
  percent: number
  nextLessonSlug: string | null
}

/**
 * Pure progress calculation. `lessonSlugs` must already be sorted in course order.
 */
export function summarizeCourse(lessonSlugs: string[], completed: Set<string>): CourseProgress {
  const unique = [...new Set(lessonSlugs)]
  const completedLessons = unique.filter((slug) => completed.has(slug)).length
  const totalLessons = unique.length
  const percent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100)
  const nextLessonSlug = unique.find((slug) => !completed.has(slug)) ?? null

  return { totalLessons, completedLessons, percent, nextLessonSlug }
}

export interface OverallProgress {
  totalLessons: number
  completedLessons: number
  percent: number
}

export function summarizeOverall(courses: CourseProgress[]): OverallProgress {
  const totalLessons = courses.reduce((sum, course) => sum + course.totalLessons, 0)
  const completedLessons = courses.reduce((sum, course) => sum + course.completedLessons, 0)
  const percent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100)
  return { totalLessons, completedLessons, percent }
}
