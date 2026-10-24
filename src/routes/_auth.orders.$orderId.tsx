import { createFileRoute } from '@tanstack/react-router'
import { OrderPage } from '@/features/checkout/components/order-page'

export const Route = createFileRoute('/_auth/orders/$orderId')({
  head: () => ({ meta: [{ title: 'Seu pedido · Kurio' }] }),
  component: OrderRoute,
})

function OrderRoute() {
  const { orderId } = Route.useParams()
  // key: trocar de pedido recomeça a tela do zero.
  return <OrderPage key={orderId} orderId={orderId} />
}
