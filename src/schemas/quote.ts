import { z } from 'zod'
import type { CartId, CartItemId, EditionId, NftId, Quote, QuoteId } from '@/types'
import { BLOCKCHAINS, branded, decimalString, isoDate } from './common'

export const quoteSchema = z.object({
  id: branded<QuoteId>(),
  cartId: branded<CartId>(),
  cartVersion: z.number().int().min(0),
  network: z.enum(BLOCKCHAINS),
  lines: z.array(
    z.object({
      cartItemId: branded<CartItemId>(),
      nftId: branded<NftId>(),
      editionId: branded<EditionId>(),
      quantity: z.number().int().min(1),
      unitPrice: decimalString,
      previousUnitPrice: decimalString.nullable(),
      lineTotal: decimalString,
      availableQuantity: z.number().int().nullable(),
    }),
  ),
  subtotal: decimalString,
  discount: decimalString,
  coupon: z.object({ code: z.string(), kind: z.enum(['percent', 'fixed']), value: z.string() }).nullable(),
  networkFee: decimalString,
  feeIsEstimate: z.boolean(),
  total: decimalString,
  issues: z.array(
    z.object({
      code: z.enum(['PRICE_CHANGED', 'EDITION_SOLD_OUT', 'INSUFFICIENT_STOCK', 'COUPON_INVALID', 'COUPON_EXPIRED', 'NETWORK_FEE_CHANGED']),
      severity: z.enum(['blocking', 'info']),
      cartItemId: branded<CartItemId>().optional(),
      previous: z.string().optional(),
      current: z.string().optional(),
      message: z.string(),
    }),
  ),
  status: z.enum(['valid', 'stale', 'expired']),
  expiresAt: isoDate,
  createdAt: isoDate,
}) satisfies z.ZodType<Quote>

export const quoteRequestSchema = z.object({
  network: z.enum(BLOCKCHAINS).default('ethereum'),
})
