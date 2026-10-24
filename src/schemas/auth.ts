import { z } from 'zod'
import type { AuthSession, User, UserId } from '@/types'
import { branded, isoDate } from './common'

const email = z.string().trim().toLowerCase().email('Informe um e-mail válido')

const username = z
  .string()
  .trim()
  .min(3, 'Mínimo de 3 caracteres')
  .max(24, 'Máximo de 24 caracteres')
  .regex(/^[a-zA-Z0-9_]+$/, 'Use apenas letras, números e _')

export const passwordRule = z
  .string()
  .min(8, 'Mínimo de 8 caracteres')
  .regex(/[A-Z]/, 'Inclua uma letra maiúscula')
  .regex(/[a-z]/, 'Inclua uma letra minúscula')
  .regex(/\d/, 'Inclua um número')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe a senha'),
})

export const registerBaseSchema = z.object({
  username,
  email,
  password: passwordRule,
  confirmPassword: z.string().min(1, 'Confirme a senha'),
})

/** Formulário (cliente): valida a confirmação. */
export const registerSchema = registerBaseSchema.refine((d) => d.password === d.confirmPassword, {
  path: ['confirmPassword'],
  message: 'As senhas não conferem',
})

/** Corpo enviado à API: sem confirmPassword. */
export const registerRequestSchema = registerBaseSchema.omit({ confirmPassword: true })

export const userSchema = z.object({
  id: branded<UserId>(),
  email: z.string(),
  username: z.string(),
  displayName: z.string(),
  ensName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
}) satisfies z.ZodType<User>

export const authSessionSchema = z.object({
  user: userSchema,
  accessToken: z.string().min(1),
  expiresAt: isoDate,
}) satisfies z.ZodType<AuthSession>

export const sessionInfoSchema = z.object({ user: userSchema, expiresAt: isoDate })
export type SessionInfo = z.infer<typeof sessionInfoSchema>