import { z } from 'zod'
import type { UserId, Wallet, WalletConnection, WalletId } from '@/types'
import { BLOCKCHAINS, branded, isoDate } from './common'

export const WALLET_PROVIDERS = ['walletconnect', 'metamask', 'coinbase'] as const

const required = (label: string) => z.string().trim().min(1, `Informe ${label}.`)

export const ensNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{3,}(\.[a-z0-9-]+)*\.eth$/, 'Use um nome ENS válido, ex.: ana.kurio.eth')

/** Campos do formulário de carteira (Figma) — o mesmo schema valida o formulário e o handler. */
export const walletInputSchema = z.object({
  role: z.enum(['primary', 'secondary']),
  displayName: required('o nome de exibição').pipe(z.string().min(2, 'Mínimo de 2 caracteres.')),
  nickname: required('o apelido da carteira').pipe(z.string().max(24, 'Máximo de 24 caracteres.')),
  network: z.enum(BLOCKCHAINS, { errorMap: () => ({ message: 'Selecione uma rede.' }) }),
  address: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais.'),
  ensName: ensNameSchema.nullable(),
  secondaryReference: z
    .string()
    .trim()
    .refine((v) => v === '' || /^0x[a-fA-F0-9]{40}$/.test(v) || /\.eth$/.test(v), 'Use um ENS (.eth) ou endereço 0x.')
    .transform((v) => v || null)
    .nullable(),
  provider: z.enum(WALLET_PROVIDERS, { errorMap: () => ({ message: 'Selecione o tipo de carteira.' }) }),
  profileName: required('o nome do perfil'),
  referralCode: z.string().trim().regex(/^[A-Za-z0-9-]{4,16}$/, 'Código de indicação: 4 a 16 letras, números ou hífen.'),
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
})

export const walletSchema = z.object({
  id: branded<WalletId>(),
  userId: branded<UserId>(),
  role: z.enum(['primary', 'secondary']),
  displayName: z.string(),
  nickname: z.string(),
  network: z.enum(BLOCKCHAINS),
  address: z.string(),
  ensName: z.string().nullable(),
  secondaryReference: z.string().nullable(),
  provider: z.enum(WALLET_PROVIDERS),
  profileName: z.string(),
  referralCode: z.string(),
  email: z.string(),
  updatedAt: isoDate,
}) satisfies z.ZodType<Wallet>

export const walletListSchema = z.object({ items: z.array(walletSchema) })

export const connectWalletSchema = z.object({
  provider: z.enum(WALLET_PROVIDERS),
  network: z.enum(BLOCKCHAINS),
})

export const walletConnectionSchema = z.object({
  walletId: branded<WalletId>().nullable(),
  provider: z.enum(WALLET_PROVIDERS),
  network: z.enum(BLOCKCHAINS),
  status: z.enum(['disconnected', 'connecting', 'connected', 'rejected']),
  connectedAt: isoDate.nullable(),
}) satisfies z.ZodType<WalletConnection>
