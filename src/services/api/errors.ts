import axios from 'axios'
import { apiErrorBodySchema } from '@/schemas/api'
import type { ApiErrorBody, ApiErrorCode } from '@/types'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly retryable: boolean
  readonly requestId?: string
  readonly fieldErrors?: Record<string, string[]>
  readonly details?: Record<string, unknown>

  constructor(body: ApiErrorBody, options?: ErrorOptions) {
    super(body.message, options)
    this.name = 'ApiError'
    this.code = body.code
    this.status = body.status
    this.retryable = body.retryable
    this.requestId = body.requestId
    this.fieldErrors = body.fieldErrors
    this.details = body.details
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError

function fromStatus(status: number): Omit<ApiErrorBody, 'message' | 'status'> {
  if (status === 401) return { code: 'UNAUTHENTICATED', retryable: false }
  if (status === 403) return { code: 'FORBIDDEN', retryable: false }
  if (status === 404) return { code: 'NOT_FOUND', retryable: false }
  if (status === 409) return { code: 'CONFLICT', retryable: false }
  if (status === 400 || status === 422) return { code: 'VALIDATION_ERROR', retryable: false }
  return { code: 'TRANSIENT', retryable: status >= 500 }
}

/** Converte qualquer falha em ApiError. Cancelamentos (AbortSignal) NÃO passam por aqui. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      return new ApiError(
        {
          code: 'NETWORK_ERROR',
          status: 0,
          retryable: true,
          message: timedOut
            ? 'A requisição demorou demais. Tente novamente.'
            : 'Sem conexão com o servidor. Verifique sua internet.',
        },
        { cause: error },
      )
    }
    const { status, data } = error.response
    const parsed = apiErrorBodySchema.safeParse(data)
    if (parsed.success) {
      const { retryable, ...rest } = parsed.data
      return new ApiError(
        { ...rest, status, retryable: retryable ?? status >= 500 },
        { cause: error },
      )
    }
    return new ApiError(
      { ...fromStatus(status), status, message: 'Não foi possível concluir a operação.' },
      { cause: error },
    )
  }

  return new ApiError(
    { code: 'TRANSIENT', status: 0, retryable: false, message: 'Erro inesperado.' },
    { cause: error },
  )
}