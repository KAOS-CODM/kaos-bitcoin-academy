import { z } from 'zod'

export const quizAttemptSchema = z
  .object({
    attemptKey: z.string().uuid('Use a valid attempt key.').max(64, 'Attempt key is too long.'),
    answers: z
      .array(
        z
          .object({
            questionId: z.string().trim().min(1, 'Question id is required.').max(100),
            optionId: z.string().trim().min(1, 'Option id is required.').max(100),
          })
          .strict(),
      )
      .min(1, 'Answer at least one question.')
      .max(50, 'Too many answers.'),
  })
  .strict()

export type QuizAttemptInput = z.infer<typeof quizAttemptSchema>
