import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { announce } from '@/components/feedback/announcer'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { Button } from '@/components/ui/button'
import { FieldError, SelectField, TextAreaField, TextField } from '@/components/ui/form-field'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatDateTime } from '@/lib/date'
import { applyApiErrors } from '@/lib/form-errors'
import { formatEth } from '@/lib/money'
import { toast } from '@/lib/toast'
import { supportTicketInputSchema } from '@/schemas/member'
import type { SupportCategory } from '@/types'
import { useCreateSupportTicket, useOrders, useSupportTickets } from '../hooks/use-member'
import { SectionHeader } from './section-header'

const CATEGORY_LABEL: Record<SupportCategory, string> = {
  pedido: 'Pedido',
  pagamento: 'Pagamento',
  carteira: 'Carteira',
  conta: 'Conta e acesso',
  outro: 'Outro assunto',
}
const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label }))

type FormInput = z.input<typeof supportTicketInputSchema>
type FormOutput = z.output<typeof supportTicketInputSchema>

/** Abre chamados de suporte (persistidos na API simulada) e lista os já abertos. */
export function SupportPage() {
  return (
    <>
      <SectionHeader title="Suporte" description="Conte o que aconteceu. Cada chamado recebe um protocolo para acompanhamento." />
      <div className="space-y-10">
        <TicketForm />
        <TicketList />
      </div>
    </>
  )
}

function TicketForm() {
  const create = useCreateSupportTicket()
  const orders = useOrders()
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(supportTicketInputSchema),
    defaultValues: { category: undefined, subject: '', orderId: '', message: '' },
  })
  const { errors, isSubmitting } = form.formState

  const orderOptions = (orders.data ?? []).map((o) => ({
    value: o.id,
    label: `${formatDate(o.createdAt)} · ${formatEth(o.total)} ETH · ${o.status === 'confirmed' ? 'confirmado' : o.status === 'rejected' ? 'recusado' : 'pendente'}`,
  }))

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const ticket = await create.mutateAsync(values)
      form.reset({ category: undefined, subject: '', orderId: '', message: '' })
      toast.success(`Chamado ${ticket.protocol} aberto.`, { description: 'Você pode acompanhá-lo na lista abaixo.' })
      announce(`Chamado ${ticket.protocol} aberto.`)
    } catch (error) {
      applyApiErrors(error, form.setError, ['category', 'subject', 'orderId', 'message'])
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Novo chamado" className="space-y-5">
      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        <SelectField label="Assunto" required placeholder="Selecione um assunto" options={CATEGORY_OPTIONS} error={errors.category?.message} {...form.register('category')} />
        <SelectField
          label="Pedido relacionado (opcional)"
          placeholder={orders.isPending ? 'Carregando pedidos…' : 'Nenhum pedido'}
          options={orderOptions}
          error={errors.orderId?.message}
          {...form.register('orderId')}
        />
        <TextField label="Título" required className="md:col-span-2" error={errors.subject?.message} {...form.register('subject')} />
        <TextAreaField label="Mensagem" className="md:col-span-2" rows={5} error={errors.message?.message} {...form.register('message')} />
      </div>
      {errors.root?.server?.message && <div role="alert"><FieldError>{errors.root.server.message}</FieldError></div>}
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Enviando…' : 'Abrir chamado'}</Button>
    </form>
  )
}

function TicketList() {
  const tickets = useSupportTickets()

  return (
    <section aria-labelledby="tickets-title" className="space-y-4">
      <h2 id="tickets-title" className="text-title">Seus chamados</h2>
      {tickets.isPending ? (
        <div aria-busy="true" aria-label="Carregando chamados" className="space-y-3">
          {Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : tickets.isError ? (
        <ErrorState title="Não foi possível carregar seus chamados" error={tickets.error} onRetry={() => void tickets.refetch()} retrying={tickets.isFetching} />
      ) : tickets.data.length === 0 ? (
        <EmptyState title="Nenhum chamado aberto" description="Quando você abrir um chamado, ele aparece aqui com o protocolo." />
      ) : (
        <ul className="space-y-3" data-testid="tickets-list">
          {tickets.data.map((ticket) => (
            <li key={ticket.id} className="space-y-1 rounded-lg bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">{ticket.subject}</h3>
                <span className="rounded-sm border border-primary/60 px-2 py-0.5 text-micro font-bold text-primary">Aberto</span>
              </div>
              <p className="text-micro text-muted-foreground">
                Protocolo <span className="font-bold text-foreground">{ticket.protocol}</span> · {CATEGORY_LABEL[ticket.category]} ·{' '}
                <time dateTime={ticket.createdAt}>{formatDateTime(ticket.createdAt)}</time>
              </p>
              <p className="whitespace-pre-line break-words text-body">{ticket.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
