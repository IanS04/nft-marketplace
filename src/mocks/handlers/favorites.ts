import { http, HttpResponse } from 'msw'
import type { NftId } from '@/types'
import { apiUrl } from '../api-path'
import { authenticate } from '../auth-guard'
import { withConditions } from '../chaos'
import { mockDb } from '../db/db'
import { apiError } from '../http-utils'
import { toSummary } from './nfts'

const listFor = (userId: string): NftId[] => mockDb.read().favorites[userId] ?? []

export const favoriteHandlers = [
  http.get(apiUrl('/favorites'), withConditions(({ request }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    return HttpResponse.json({ nftIds: listFor(auth.userId) })
  })),

  /** Lista de interesse: os NFTs favoritados (resumo do catálogo, na ordem em que foram favoritados). */
  http.get(apiUrl('/favorites/nfts'), withConditions(({ request }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    const records = new Map(mockDb.read().nfts.map((r) => [r.nft.id, r.nft]))
    const items = listFor(auth.userId).flatMap((id) => {
      const nft = records.get(id)
      return nft ? [toSummary(nft)] : []
    })
    return HttpResponse.json({ items })
  })),

  http.put(apiUrl('/favorites/:nftId'), withConditions(({ request, params }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    const nftId = String(params.nftId) as NftId
    if (!mockDb.read().nfts.some((r) => r.nft.id === nftId)) {
      return apiError('NOT_FOUND', 'NFT não encontrado.', 404)
    }
    mockDb.write((db) => {
      const current = db.favorites[auth.userId] ?? []
      if (!current.includes(nftId)) db.favorites[auth.userId] = [...current, nftId]
    })
    return HttpResponse.json({ nftIds: listFor(auth.userId) })
  })),

  http.delete(apiUrl('/favorites/:nftId'), withConditions(({ request, params }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    const nftId = String(params.nftId)
    mockDb.write((db) => {
      db.favorites[auth.userId] = (db.favorites[auth.userId] ?? []).filter((id) => id !== nftId)
    })
    return HttpResponse.json({ nftIds: listFor(auth.userId) })
  })),
]