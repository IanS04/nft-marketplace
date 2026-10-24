import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.string().min(1).default('/api'),
  VITE_SOCKET_URL: z.string().optional().transform((v) => v || undefined),
  VITE_ENABLE_MOCKS: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
  VITE_MOCK_SCENARIO: z.string().default('default'),
})

export const env = envSchema.parse(import.meta.env)