import { z } from 'zod'
import { isDecimalString } from '@/lib/money'
import type { Blockchain, DecimalString, ImageAsset } from '@/types'

/*
 * Único arquivo com cast para tipos "brand". A validação acontece aqui; o resto do código
 * confia no tipo. O cast via `unknown` faz entrada e saída do schema terem o tipo brand,
 * o que permite usar `satisfies z.ZodType<T>` nos schemas que dependem destes.
 */
export const branded = <T extends string>() => z.string().min(1) as unknown as z.ZodType<T>

/** ETH como string decimal não negativa ("1.19"). Nunca number. */
export const decimalString = z
  .string()
  .refine(isDecimalString, 'Valor decimal inválido (ex.: "1.19")') as unknown as z.ZodType<DecimalString>

export const isoDate = z.string().datetime({ offset: true })

export const BLOCKCHAINS = ['ethereum', 'polygon', 'solana'] as const satisfies readonly Blockchain[]

export const imageAssetSchema = z.object({
  url: z.string().min(1),
  alt: z.string(),
  srcSet: z.string().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
}) satisfies z.ZodType<ImageAsset>
