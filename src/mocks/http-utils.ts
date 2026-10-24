import { HttpResponse } from 'msw'
import type { z } from 'zod'
import type { ApiErrorBody, ApiErrorCode } from '@/types'

interface ApiErrorExtras {
  retryable?: boolean
  fieldErrors?: Record<string, string[]>
  details?: Record<string, unknown>
}

/** Resposta de erro no formato do contrato (ApiErrorBody). 5xx é retryable por padrão. */
export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  { retryable, fieldErrors, details }: ApiErrorExtras = {},
): Response {
  const body: ApiErrorBody = {
    code,
    message,
    status,
    retryable: retryable ?? status >= 500,
    ...(fieldErrors && { fieldErrors }),
    ...(details && { details }),
  }
  return HttpResponse.json(body, { status })
}

/** 422 com fieldErrors indexados pelo caminho do campo ("email", "items.0.quantity"). */
export function validationError(error: z.ZodError, message = 'Verifique os campos destacados.'): Response {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form'
    ;(fieldErrors[key] ??= []).push(issue.message)
  }
  return apiError('VALIDATION_ERROR', message, 422, { fieldErrors })
}

/** Corpo JSON ou null (corpo vazio/inválido vira erro de validação no schema). */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.clone().json()
  } catch {
    return null
  }
}
