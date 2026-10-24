import { z } from 'zod'
import type { Cart, CartId, CartItem, CartItemId, EditionId, NftId, UserId } from '@/types'
import { branded, decimalString, imageAssetSchema, isoDate } from './common'

export const MAX_CART_QUANTITY = 99

const quantity = z
  .number({ invalid_type_error: 'Informe a quantidade.' })
  .int('A quantidade deve ser um número inteiro.')
  .min(1, 'A quantidade mínima é 1.')
  .max(MAX_CART_QUANTITY, `A quantidade máxima é ${MAX_CART_QUANTITY}.`)

export const cartItemSchema = z.object({
  id: branded<CartItemId>(),
  nftId: branded<NftId>(),
  editionId: branded<EditionId>(),
  quantity: z.number().int().min(1),
  maxQuantity: z.number().int().min(0),
  unitPrice: decimalString,
  lineTotal: decimalString,
  availability: z.enum(['available', 'low_stock', 'unavailable']),
  nft: z.object({ name: z.string(), tokenId: z.string(), image: imageAssetSchema }),
  edition: z.object({ label: z.string() }),
}) satisfies z.ZodType<CartItem>

export const cartSchema = z.object({
  id: branded<CartId>(),
  ownerId: branded<UserId>().nullable(),
  items: z.array(cartItemSchema),
  itemCount: z.number().int().min(0),
  couponCode: z.string().nullable(),
  version: z.number().int().min(0),
  updatedAt: isoDate,
}) satisfies z.ZodType<Cart>

/* ---------- Corpos de requisição (validados pelo handler MSW) ---------- */

export const addCartItemSchema = z.object({
  nftId: branded<NftId>(),
  editionId: branded<EditionId>(),
  quantity,
})

export const updateCartItemSchema = z.object({ quantity })

export const couponRequestSchema = z.object({
  code: z
    .string({ required_error: 'Informe o código promocional.' })
    .trim()
    .min(1, 'Informe o código promocional.')
    .max(32, 'Código muito longo.')
    .transform((code) => code.toUpperCase()),
})
