import { z } from 'zod'
import { API_ERROR_CODES } from '@/types'

export const apiErrorBodySchema = z.object({
  code: z.enum(API_ERROR_CODES),
  message: z.string(),
  status: z.number().int().optional(),
  retryable: z.boolean().optional(),
  requestId: z.string().optional(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  details: z.record(z.string(), z.unknown()).optional(),
})

export const pageInfoSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(1),
})