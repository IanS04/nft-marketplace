import { createFileRoute } from '@tanstack/react-router'
import { CartPage } from '@/features/cart/components/cart-page'

// Público: o visitante também tem carrinho. Só o checkout exige login.
export const Route = createFileRoute('/cart')({
  head: () => ({ meta: [{ title: 'Carrinho · Kurio' }] }),
  component: CartPage,
})
