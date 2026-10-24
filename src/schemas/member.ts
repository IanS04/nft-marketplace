import { z } from 'zod'
import type {
  ActivityItem, CreateSupportTicketInput, DownloadGrant, DownloadItem, EditionId, NftId, Offer, OrderId,
  SupportCategory, SupportTicket,
} from '@/types'
import { branded, decimalString, isoDate } from './common'

export const ACTIVITY_TYPES = ['order.created', 'order.confirmed', 'order.rejected', 'download', 'support.ticket'] as const
export const SUPPORT_CATEGORIES = ['pedido', 'pagamento', 'carteira', 'conta', 'outro'] as const satisfies readonly SupportCategory[]

export const activityItemSchema = z.object({
  id: z.string(),
  type: z.enum(ACTIVITY_TYPES),
  occurredAt: isoDate,
  title: z.string(),
  description: z.string(),
  orderId: branded<OrderId>().nullable(),
}) satisfies z.ZodType<ActivityItem>

export const activityListSchema = z.object({ items: z.array(activityItemSchema) })

export const offerSchema = z.object({
  code: z.string(),
  title: z.string(),
  description: z.string(),
  kind: z.enum(['percent', 'fixed']),
  value: decimalString,
  status: z.enum(['active', 'expired']),
  validUntil: isoDate,
}) satisfies z.ZodType<Offer>

export const offerListSchema = z.object({ items: z.array(offerSchema) })

export const downloadItemSchema = z.object({
  id: z.string(),
  orderId: branded<OrderId>(),
  nftId: branded<NftId>(),
  editionId: branded<EditionId>(),
  name: z.string(),
  editionLabel: z.string(),
  imageUrl: z.string(),
  imageAlt: z.string(),
  fileName: z.string(),
  purchasedAt: isoDate,
  downloadCount: z.number().int().min(0),
  lastDownloadedAt: isoDate.nullable(),
}) satisfies z.ZodType<DownloadItem>

export const downloadListSchema = z.object({ items: z.array(downloadItemSchema) })

export const downloadGrantSchema = z.object({
  item: downloadItemSchema,
  url: z.string(),
  fileName: z.string(),
}) satisfies z.ZodType<DownloadGrant>

/** O mesmo schema valida o formulário de suporte e o handler. */
export const supportTicketInputSchema = z.object({
  category: z.enum(SUPPORT_CATEGORIES, { errorMap: () => ({ message: 'Escolha um assunto.' }) }),
  subject: z.string().trim().min(5, 'Mínimo de 5 caracteres.').max(80, 'Máximo de 80 caracteres.'),
  // Select nativo manda "" quando nada é escolhido: vira null.
  orderId: z.preprocess((v) => (v === '' ? null : v), branded<OrderId>().nullable()),
  message: z.string().trim().min(20, 'Descreva com pelo menos 20 caracteres.').max(1000, 'Máximo de 1000 caracteres.'),
}) satisfies z.ZodType<CreateSupportTicketInput, z.ZodTypeDef, unknown>

export const supportTicketSchema = z.object({
  id: z.string(),
  protocol: z.string(),
  category: z.enum(SUPPORT_CATEGORIES),
  subject: z.string(),
  orderId: branded<OrderId>().nullable(),
  message: z.string(),
  status: z.literal('open'),
  createdAt: isoDate,
}) satisfies z.ZodType<SupportTicket>

export const supportTicketListSchema = z.object({ items: z.array(supportTicketSchema) })
