import { z } from 'zod'

export const tutorChatSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, 'Type a question for the tutor.')
      .max(1_000, 'Keep your question under 1,000 characters.'),
    lessonSlug: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9-]+$/, 'Use a valid lesson slug.')
      .optional(),
    history: z
      .array(
        z
          .object({
            role: z.enum(['user', 'assistant']),
            content: z
              .string()
              .trim()
              .min(1, 'History messages cannot be empty.')
              .max(2_000, 'History message is too long.'),
          })
          .strict(),
      )
      .max(8, 'Too much conversation history.')
      .optional()
      .default([]),
  })
  .strict()

export type TutorChatInput = z.infer<typeof tutorChatSchema>
