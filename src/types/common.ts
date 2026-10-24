declare const brand: unique symbol
export type Brand<T, B extends string> = T & { readonly [brand]: B }

/** ETH sempre trafega como string decimal ("1.19"). Nunca converter para number. */
export type DecimalString = Brand<string, 'DecimalString'>
export type EthAmount = DecimalString
export type ISODateString = string

export type NftId = Brand<string, 'NftId'>
export type EditionId = Brand<string, 'EditionId'>
export type UserId = Brand<string, 'UserId'>
export type WalletId = Brand<string, 'WalletId'>
export type CartId = Brand<string, 'CartId'>
export type CartItemId = Brand<string, 'CartItemId'>
export type QuoteId = Brand<string, 'QuoteId'>
export type OrderId = Brand<string, 'OrderId'>

export type Blockchain = 'ethereum' | 'polygon' | 'solana'

export interface ImageAsset {
  url: string
  alt: string
  /** Variações responsivas ("/a-400.webp 400w, /a-800.webp 800w") */
  srcSet?: string
  width: number
  height: number
}
