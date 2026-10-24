import { z } from 'zod'
import type { EditionId, NftId, Order, OrderId, QuoteId, UserId, WalletId } from '@/types'
import { BLOCKCHAINS, branded, decimalString, isoDate } from './common'
import { WALLET_PROVIDERS } from './wallet'

/** "Perfil do colecionador" do checkout. O mesmo schema valida o formulário e o handler. */
export const collectorDetailsSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição.'),
  username: z.string().trim().regex(/^[a-zA-Z0-9_]{3,24}$/, 'Nome de usuário: 3 a 24 letras, números ou _.'),
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil.'),
  referralCode: z.string().trim().regex(/^[A-Za-z0-9-]{4,16}$/, 'Código de indicação: 4 a 16 letras, números ou hífen.'),
  ensName: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,}(\.[a-z0-9-]+)*\.eth$/, 'Informe o nome ENS, ex.: ana.kurio.eth').nullable(),
  note: z.string().trim().max(280, 'Máximo de 280 caracteres.').optional(),
})

export const createOrderSchema = z.object({
  quoteId: branded<QuoteId>(),
  cartVersion: z.number().int().min(0),
  walletId: branded<WalletId>(),
  provider: z.enum(WALLET_PROVIDERS),
  network: z.enum(BLOCKCHAINS),
  collector: collectorDetailsSchema,
})

const itemSnapshot = z.object({
  nftId: branded<NftId>(),
  editionId: branded<EditionId>(),
  name: z.string(),
  tokenId: z.string(),
  imageUrl: z.string(),
  imageAlt: z.string(),
  editionLabel: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: decimalString,
  lineTotal: decimalString,
})

const base = {
  id: branded<OrderId>(),
  userId: branded<UserId>(),
  quoteId: branded<QuoteId>(),
  items: z.array(itemSnapshot),
  subtotal: decimalString,
  discount: decimalString,
  couponCode: z.string().nullable(),
  networkFee: decimalString,
  total: decimalString,
  network: z.enum(BLOCKCHAINS),
  walletId: branded<WalletId>(),
  walletProvider: z.enum(WALLET_PROVIDERS),
  walletAddress: z.string(),
  collector: collectorDetailsSchema,
  createdAt: isoDate,
  updatedAt: isoDate,
  version: z.number().int().min(1),
}

const rejection = z.object({
  reason: z.enum(['PAYMENT_DECLINED', 'WALLET_REJECTED', 'PRICE_CHANGED', 'EDITION_SOLD_OUT']),
  message: z.string(),
})

/** União discriminada por `status`: TypeScript sabe que só o confirmado tem transactionId. */
export const orderSchema = z.discriminatedUnion('status', [
  z.object({ ...base, status: z.literal('pending'), transactionId: z.null(), rejection: z.null() }),
  z.object({
    ...base,
    status: z.literal('confirmed'),
    transactionId: z.string(),
    explorerUrl: z.string(),
    confirmedAt: isoDate,
    rejection: z.null(),
  }),
  z.object({ ...base, status: z.literal('rejected'), transactionId: z.null(), rejection }),
]) satisfies z.ZodType<Order>

export const orderListSchema = z.object({ items: z.array(orderSchema) })
