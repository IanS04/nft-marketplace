import { zodResolver } from '@hookform/resolvers/zod'
import { Tag, X } from 'lucide-react'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from '@/lib/toast'
import { announce } from '@/components/feedback/announcer'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { applyApiErrors, errorMessage } from '@/lib/form-errors'
import { couponRequestSchema } from '@/schemas/cart'
import { useApplyCoupon, useRemoveCoupon } from '../hooks/use-cart'

/** Aplicar/remover cupom. Inválido ou expirado: a mensagem da API aparece ligada ao campo. */
export function CouponForm({ appliedCode }: { appliedCode: string | null }) {
  const id = useId()
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const form = useForm({ resolver: zodResolver(couponRequestSchema), defaultValues: { code: '' } })
  const error = form.formState.errors.code?.message ?? form.formState.errors.root?.server?.message

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-sm border border-success/60 bg-success/10 px-3 py-2 text-body">
        <span className="flex items-center gap-2">
          <Tag className="size-4 text-success" aria-hidden="true" />
          Cupom <strong>{appliedCode}</strong> aplicado
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={remove.isPending}
          onClick={async () => {
            try {
              await remove.mutateAsync()
              announce('Cupom removido.')
            } catch (e) {
              toast.error('Não foi possível remover o cupom.', { description: errorMessage(e) })
            }
          }}
        >
          <X aria-hidden="true" /> Remover<span className="sr-only"> cupom {appliedCode}</span>
        </Button>
      </div>
    )
  }

  const onSubmit = form.handleSubmit(async ({ code }) => {
    try {
      await apply.mutateAsync(code)
      form.reset()
      announce(`Cupom ${code} aplicado.`)
    } catch (e) {
      applyApiErrors(e, form.setError, ['code'])
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-1" aria-label="Cupom promocional">
      <label htmlFor={`${id}-code`} className="max-md:sr-only md:font-bold">Código promocional</label>
      <div className="flex gap-2 md:gap-0">
        <Input
          id={`${id}-code`}
          placeholder="Digite o código promocional…"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="max-md:h-12 max-md:rounded-full max-md:bg-background max-md:px-5 md:rounded-r-none md:border-r-0"
          {...form.register('code')}
        />
        <Button
          type="submit"
          disabled={apply.isPending}
          className="max-md:h-12 max-md:rounded-full max-md:bg-primary-gradient max-md:px-6 md:rounded-l-none"
        >
          {apply.isPending ? 'Aplicando…' : 'Aplicar'}
        </Button>
      </div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </form>
  )
}
