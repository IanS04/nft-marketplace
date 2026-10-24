import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { isApiError } from '@/services/api/errors'

export const errorMessage = (error: unknown): string =>
  isApiError(error) ? error.message : 'Não foi possível concluir. Tente novamente.'

/**
 * Leva os erros da API para o formulário: cada `fieldErrors[campo]` vai para o campo certo
 * (e o primeiro recebe foco). Sem fieldErrors, a mensagem vai para `root.server`.
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): void {
  let mapped = false
  if (isApiError(error) && error.fieldErrors) {
    for (const field of fields) {
      const message = error.fieldErrors[field]?.[0]
      if (!message) continue
      setError(field, { type: 'server', message }, { shouldFocus: !mapped })
      mapped = true
    }
  }
  if (!mapped) setError('root.server', { type: 'server', message: errorMessage(error) })
}
