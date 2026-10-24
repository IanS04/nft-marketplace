import { useCart } from '../hooks/use-cart'

/** Contador do ícone do carrinho (header e tab bar). O texto acessível acompanha o ícone. */
export function CartCountBadge() {
  const count = useCart().data?.itemCount ?? 0
  return (
    <>
      {count > 0 && (
        <span
          aria-hidden="true"
          data-testid="cart-count"
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-bold leading-none text-primary-foreground"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
      <span className="sr-only">Carrinho{count > 0 ? `, ${count} ${count === 1 ? 'item' : 'itens'}` : ''}</span>
    </>
  )
}
