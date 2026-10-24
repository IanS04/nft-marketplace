import { z } from 'zod'
import type { Creator, CreatorSummary } from '@/types'
import { BLOCKCHAINS, decimalString, imageAssetSchema, isoDate } from './common'
import { nftSummarySchema } from './nft'

export const creatorSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  role: z.string(),
  location: z.string(),
  tagline: z.string(),
  modelName: z.string(),
  artwork: imageAssetSchema,
  preferredNetwork: z.enum(BLOCKCHAINS),
  stats: z.object({
    nftCount: z.number().int().min(0),
    floorPrice: decimalString.nullable(),
    editionsAvailable: z.number().int().min(0),
  }),
}) satisfies z.ZodType<CreatorSummary>

export const creatorSchema = creatorSummarySchema.extend({
  bio: z.string(),
  memberSince: isoDate,
  royaltyPercent: decimalString,
  tools: z.array(z.string()),
  process: z.array(z.object({ title: z.string(), text: z.string() })),
  nfts: z.array(nftSummarySchema),
}) satisfies z.ZodType<Creator>

export const creatorListSchema = z.object({ items: z.array(creatorSummarySchema) })

/** Slug do criador na URL ("marina-okada"). */
export const creatorIdParamSchema = z.string().regex(/^[a-z0-9-]{3,64}$/)
