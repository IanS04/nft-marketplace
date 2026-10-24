import { z } from 'zod'
import type { EditionId, NftId, NftUpdatedEvent, OrderId, OrderUpdatedEvent, UserId } from '@/types'
import { branded, decimalString, isoDate } from './common'

const envelope = {
  eventId: z.string().min(1),
  version: z.number().int().min(1),
  occurredAt: isoDate,
  userId: branded<UserId>().optional(),
}

/** Eventos chegam pelo socket: são validados como qualquer resposta da API (inválido = descartado). */
export const nftUpdatedEventSchema = z.object({
  ...envelope,
  type: z.literal('nft.updated'),
  resource: z.object({ type: z.literal('nft'), id: z.string() }),
  payload: z.object({
    nftId: branded<NftId>(),
    price: decimalString,
    compareAtPrice: decimalString.nullable(),
    editions: z.array(
      z.object({
        id: branded<EditionId>(),
        price: decimalString,
        available: z.number().int().nullable(),
        status: z.enum(['available', 'low_stock', 'sold_out']),
      }),
    ),
  }),
}) satisfies z.ZodType<NftUpdatedEvent>

export const orderUpdatedEventSchema = z.object({
  ...envelope,
  type: z.literal('order.updated'),
  resource: z.object({ type: z.literal('order'), id: z.string() }),
  payload: z.object({
    orderId: branded<OrderId>(),
    status: z.enum(['pending', 'confirmed', 'rejected']),
    transactionId: z.string().nullable(),
    rejection: z
      .object({
        reason: z.enum(['PAYMENT_DECLINED', 'WALLET_REJECTED', 'PRICE_CHANGED', 'EDITION_SOLD_OUT']),
        message: z.string(),
      })
      .nullable(),
  }),
}) satisfies z.ZodType<OrderUpdatedEvent>
