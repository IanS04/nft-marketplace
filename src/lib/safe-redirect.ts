import { z } from 'zod'

/**
 * Destino de retorno após o login (`?redirect=`). Só aceita caminhos da própria aplicação:
 * "/checkout" ok; "https://site-malicioso" e "//site-malicioso" são descartados (open redirect).
 */
export const isSafeRedirect = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')

export const authSearchSchema = z.object({
  redirect: z.string().refine(isSafeRedirect).optional().catch(undefined),
})

export type AuthSearch = z.infer<typeof authSearchSchema>
