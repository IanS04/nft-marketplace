import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { queryKeys } from '@/app/query-keys'
import type { Cart, EthAmount, Nft, NftListResponse, NftSummary, NftUpdatedEvent, RealtimeEnvelope } from '@/types'

const MAX_REMEMBERED = 500

/**
 * Guarda de eventos: tolera duplicados (mesmo eventId) e eventos antigos (versão ≤ última vista
 * para o mesmo recurso). Um evento nunca é aplicado duas vezes nem regride um estado mais novo.
 */
export class EventGuard {
  private readonly seen = new Set<string>()
  private readonly versions = new Map<string, number>()

  accept(event: Pick<RealtimeEnvelope<string, string, unknown>, 'eventId' | 'resource' | 'version'>): boolean {
    if (this.seen.has(event.eventId)) return false
    this.seen.add(event.eventId)
    if (this.seen.size > MAX_REMEMBERED) this.seen.delete(this.seen.values().next().value!)

    const key = `${event.resource.type}:${event.resource.id}`
    if (event.version <= (this.versions.get(key) ?? 0)) return false
    this.versions.set(key, event.version)
    return true
  }
}

/** Chaves de carrinho: ['user', id, 'cart'] ou ['cart', 'guest', id] (as cotações ficam "abaixo" delas). */
export const isCartKey = (key: QueryKey) =>
  key.length === 3 && ((key[0] === 'user' && key[2] === 'cart') || (key[0] === 'cart' && key[1] === 'guest'))

export interface NftUpdateEffect {
  name: string | null
  inCart: boolean
  /** Preço anterior conhecido no cache (para a mensagem "de X para Y"). */
  previousPrice: EthAmount | null
  soldOutInCart: string[]
}

/**
 * nft.updated → atualiza catálogo, destaques e detalhe NO cache (sem refetch), mas só se a versão
 * do evento for mais nova que a do dado em cache. Carrinhos que contêm o NFT são revalidados
 * na API (preço e cotação vêm do servidor).
 */
export function applyNftUpdated(queryClient: QueryClient, event: NftUpdatedEvent): NftUpdateEffect {
  const { nftId, price, compareAtPrice, editions } = event.payload
  const version = event.version
  const byEdition = new Map(editions.map((e) => [e.id, e]))
  let name: string | null = null
  let previousPrice: EthAmount | null = null

  const patchSummary = <T extends NftSummary>(item: T): T => {
    if (item.id !== nftId) return item
    name ??= item.name
    previousPrice ??= item.price
    return item.version >= version ? item : { ...item, price, compareAtPrice, version }
  }

  queryClient.setQueryData<Nft>(queryKeys.nfts.detail(nftId), (old) => {
    if (!old) return old
    name ??= old.name
    previousPrice ??= old.price
    if (old.version >= version) return old
    return {
      ...old,
      price,
      compareAtPrice,
      version,
      editions: old.editions.map((e) => {
        const update = byEdition.get(e.id)
        return update ? { ...e, price: update.price, available: update.available, status: update.status } : e
      }),
    }
  })
  queryClient.setQueriesData<NftListResponse>({ queryKey: queryKeys.nfts.lists() }, (old) =>
    old && { ...old, items: old.items.map(patchSummary) },
  )
  queryClient.setQueryData<NftSummary[]>(queryKeys.nfts.featured(), (old) => old?.map(patchSummary))

  let inCart = false
  const soldOutInCart: string[] = []
  for (const [key, cart] of queryClient.getQueriesData<Cart>({ predicate: (q) => isCartKey(q.queryKey) })) {
    const items = cart?.items.filter((i) => i.nftId === nftId) ?? []
    if (!items.length) continue
    inCart = true
    name ??= items[0]!.nft.name
    previousPrice ??= items[0]!.unitPrice
    items.forEach((i) => { if (byEdition.get(i.editionId)?.status === 'sold_out') soldOutInCart.push(`${i.nft.name} (${i.edition.label})`) })
    // Prefixo: invalida o carrinho E as cotações dele → resumo recalculado pela API.
    void queryClient.invalidateQueries({ queryKey: key })
  }

  return { name, inCart, previousPrice, soldOutInCart }
}

/** Após reconectar: eventos perdidos durante a queda são recuperados relendo da REST o que está em tela. */
export function reconcileActiveQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({
    refetchType: 'active',
    predicate: ({ queryKey: [first, , third] }) =>
      first === 'nfts' || first === 'cart' || (first === 'user' && (third === 'cart' || third === 'orders')),
  })
}
