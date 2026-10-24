import type { Blockchain, DecimalString, EthAmount, ImageAsset, ISODateString } from './common'
import type { NftSummary } from './nft'

/** Criador (artista) de um modelo de arte. As estatísticas vêm do catálogo atual. */
export interface CreatorSummary {
  id: string
  name: string
  handle: string
  role: string
  location: string
  tagline: string
  modelName: string
  artwork: ImageAsset
  preferredNetwork: Blockchain
  stats: {
    nftCount: number
    floorPrice: EthAmount | null
    editionsAvailable: number
  }
}

export interface Creator extends CreatorSummary {
  bio: string
  memberSince: ISODateString
  royaltyPercent: DecimalString
  tools: string[]
  process: { title: string; text: string }[]
  nfts: NftSummary[]
}
