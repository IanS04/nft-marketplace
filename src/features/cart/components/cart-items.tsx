import { Link } from '@tanstack/react-router'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { announce } from '@/components/feedback/announcer'
import { NftImage } from '@/components/nft/nft-image'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { errorMessage } from '@/lib/form-errors'
import { cn } from '@/lib/cn'
import { formatEthWithUnit } from '@/lib/money'
import type { CartItem } from '@/types'
import { useRemoveCartItem, useUpdateCartItem } from '../hooks/use-cart'

// Desktop (Figma): colunas NFTs | Preço | Edições | Total | remover. Mobile: um card por item.
const COLUMNS = 'md:grid md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.5rem] md:items-center md:gap-4'

export function CartItems({ items }: { items: CartItem[] }) {
  return (
    <section aria-labelledby="cart-items-title" className="space-y-2">
      <h2 id="cart-items-title" className="sr-only">Itens do carrinho</h2>
      <div aria-hidden="true" className={cn('hidden border-b border-border pb-2 font-bold', COLUMNS)}>
        <span>NFTs</span><span>Preço</span><span>Edições</span><span>Total</span><span />
      </div>
      <ul className="space-y-3 md:space-y-1">
        {items.map((item) => <CartItemRow key={item.id} item={item} />)}
      </ul>
    </section>
  )
}

function CartItemRow({ item }: { item: CartItem }) {
  // Hooks por linha: cada item mostra o próprio "ocupado" sem travar os demais.
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const busy = update.isPending || remove.isPending
  const name = `${item.nft.name} (${item.edition.label})`

  const changeQuantity = async (quantity: number) => {
    try {
      await update.mutateAsync({ id: item.id, quantity })
      announce(`Quantidade de ${name}: ${quantity}.`)
    } catch (error) {
      toast.error('Não foi possível alterar a quantidade.', { description: errorMessage(error) })
    }
  }

  const removeItem = async () => {
    try {
      await remove.mutateAsync(item.id)
      toast.success(`${item.nft.name} removido do carrinho.`)
    } catch (error) {
      toast.error('Não foi possível remover o item.', { description: errorMessage(error) })
    }
  }

  const problem =
    item.availability !== 'unavailable'
      ? null
      : item.maxQuantity === 0
        ? 'Esgotado: remova para continuar.'
        : `Só ${item.maxQuantity} disponíve${item.maxQuantity === 1 ? 'l' : 'is'}: ajuste a quantidade.`

  return (
    <li
      aria-busy={busy}
      data-testid="cart-item"
      className={cn(
        'relative grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-lg bg-card p-3 transition-opacity md:rounded-sm md:bg-transparent md:px-0',
        COLUMNS,
        busy && 'opacity-60',
      )}
    >
      <div className="row-span-3 flex items-center gap-3 md:row-span-1">
        <div className="size-20 shrink-0 overflow-hidden rounded-lg md:size-12">
          <NftImage image={{ ...item.nft.image, alt: '' }} sizes="5rem" />
        </div>
        <div className="hidden min-w-0 md:block">
          <ItemName item={item} />
        </div>
      </div>

      <div className="min-w-0 md:hidden"><ItemName item={item} /></div>

      <p className="col-start-2 font-bold text-primary max-md:text-title md:col-start-auto md:font-normal md:text-foreground">
        <span className="sr-only">Preço unitário: </span>{formatEthWithUnit(item.unitPrice)}
      </p>

      <QuantityStepper
        className="col-start-3 row-start-2 md:col-start-auto md:row-start-auto"
        value={item.quantity}
        max={Math.max(item.maxQuantity, 1)}
        onChange={(q) => void changeQuantity(q)}
        disabled={busy}
        label={`Quantidade de ${name}`}
      />

      <p className="hidden font-bold text-primary md:block" data-testid="line-total">
        <span className="sr-only">Total do item: </span>{formatEthWithUnit(item.lineTotal)}
      </p>

      <button
        type="button"
        onClick={() => void removeItem()}
        disabled={busy}
        aria-label={`Remover ${name} do carrinho`}
        className="col-start-3 row-start-1 flex size-8 items-center justify-center justify-self-end rounded-sm text-foreground hover:bg-secondary hover:text-destructive md:col-start-auto md:row-start-auto"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>

      {problem && (
        <p role="alert" className="col-span-full flex items-center gap-2 text-micro text-warning">
          <AlertTriangle className="size-4" aria-hidden="true" /> {problem}
        </p>
      )}
    </li>
  )
}

function ItemName({ item }: { item: CartItem }) {
  return (
    <>
      <h3 className="truncate font-bold">
        <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} className="hover:text-primary">{item.nft.name}</Link>
      </h3>
      <p className="text-micro text-muted-foreground">
        <span className="md:hidden">Edição: {item.edition.label}</span>
        <span className="hidden md:inline">ID do token: #{item.nft.tokenId} · {item.edition.label}</span>
      </p>
    </>
  )
}
