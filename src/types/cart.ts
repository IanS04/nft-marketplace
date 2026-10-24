import type {
  CartId, CartItemId, EditionId, EthAmount, ISODateString, ImageAsset, NftId, UserId,
} from './common'

export type CartItemAvailability = 'available' | 'low_stock' | 'unavailable'

export interface CartItem {
  id: CartItemId
  nftId: NftId
  editionId: EditionId
  quantity: number                       // inteiro
  maxQuantity: number                    // min(maxPerOrder, disponível)
  unitPrice: EthAmount
  lineTotal: EthAmount
  availability: CartItemAvailability
  nft: { name: string; tokenId: string; image: ImageAsset }
  edition: { label: string }
}

export interface Cart {
  id: CartId
  ownerId: UserId | null                 // null = visitante
  items: CartItem[]
  itemCount: number                      // soma das quantidades (badge do header)
  couponCode: string | null             // cupom aplicado (persiste com o carrinho)
  version: number                        // base da cotação
  updatedAt: ISODateString
}

export interface AddCartItemInput {
  nftId: NftId
  editionId: EditionId
  quantity: number
}

export interface UpdateCartItemInput {
  quantity: number
}