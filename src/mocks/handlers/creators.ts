import { http, HttpResponse } from 'msw'
import { compare, eth } from '@/lib/money'
import type { Creator, CreatorSummary, EthAmount, ImageAsset } from '@/types'
import { apiUrl } from '../api-path'
import { withConditions } from '../chaos'
import { mockDb, type MockDbState } from '../db/db'
import { CREATORS, type CreatorFixture } from '../fixtures/creators'
import { apiError } from '../http-utils'
import { toSummary } from './nfts'

const artworkOf = (c: CreatorFixture): ImageAsset => ({
  url: `/assets/nfts/${c.artwork}-800.webp`,
  srcSet: `/assets/nfts/${c.artwork}-400.webp 400w, /assets/nfts/${c.artwork}-800.webp 800w`,
  alt: `Arte do modelo "${c.modelName}", criado por ${c.name}`,
  width: 800,
  height: 800,
})

/** Resumo com estatísticas calculadas do catálogo ATUAL (preço e estoque mudam com o tempo real). */
function summaryOf(db: MockDbState, c: CreatorFixture): CreatorSummary {
  const nfts = db.nfts.map((r) => r.nft).filter((n) => n.creator.id === c.id)
  const floor = nfts.reduce<EthAmount | null>((min, n) => (min === null || compare(n.price, min) < 0 ? n.price : min), null)
  return {
    id: c.id,
    name: c.name,
    handle: c.handle,
    role: c.role,
    location: c.location,
    tagline: c.tagline,
    modelName: c.modelName,
    artwork: artworkOf(c),
    preferredNetwork: c.preferredNetwork,
    stats: {
      nftCount: nfts.length,
      floorPrice: floor,
      // Edições abertas não têm limite: contam só as limitadas com estoque.
      editionsAvailable: nfts.reduce((sum, n) => sum + n.editions.reduce((s, e) => s + (e.available ?? 0), 0), 0),
    },
  }
}

export const creatorHandlers = [
  http.get(apiUrl('/creators'), withConditions(() => {
    const db = mockDb.read()
    return HttpResponse.json({ items: CREATORS.map((c) => summaryOf(db, c)) })
  })),

  http.get(apiUrl('/creators/:creatorId'), withConditions(({ params }) => {
    const fixture = CREATORS.find((c) => c.id === params.creatorId)
    if (!fixture) return apiError('NOT_FOUND', 'Criador não encontrado.', 404)
    const db = mockDb.read()
    const creator: Creator = {
      ...summaryOf(db, fixture),
      bio: fixture.bio,
      memberSince: fixture.memberSince,
      royaltyPercent: eth(fixture.royaltyPercent),
      tools: fixture.tools,
      process: fixture.process,
      nfts: db.nfts.filter((r) => r.nft.creator.id === fixture.id).map((r) => toSummary(r.nft)),
    }
    return HttpResponse.json(creator)
  })),
]
