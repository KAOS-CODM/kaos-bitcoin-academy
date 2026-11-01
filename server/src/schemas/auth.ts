import { z } from 'zod'

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Enter your email address.')
    .max(254, 'That email address is too long.')
    .email('Enter a valid email address.'),
  password: z
    .string()
    .min(10, 'Use at least 10 characters.')
    .max(128, 'Use 128 characters or fewer.'),
  displayName: z
    .string()
    .trim()
    .min(2, 'Use at least 2 characters.')
    .max(40, 'Use 40 characters or fewer.'),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(3).max(254).email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.').max(128),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
