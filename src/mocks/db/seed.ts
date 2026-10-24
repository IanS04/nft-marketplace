import type { NftId, Wallet, WalletId } from '@/types'
import { FIXTURE_CREDENTIALS } from '../fixtures/users'
import { buildNftFixtures } from '../fixtures/nfts'
import { hashPassword } from './crypto'
import { SCHEMA_VERSION, type CatalogKind, type MockDbState } from './db'

export async function buildSeed(kind: CatalogKind): Promise<MockDbState> {
  const createdAt = '2026-06-01T09:00:00.000Z'

  const users = await Promise.all(
    Object.values(FIXTURE_CREDENTIALS).map(async (c) => {
      const passwordSalt = `salt-${c.id}`
      return {
        user: {
          id: c.id,
          email: c.email,
          username: c.username,
          displayName: c.displayName,
          ensName: c.id === FIXTURE_CREDENTIALS.ana.id ? 'ana.kurio.eth' : null,
          avatarUrl: null,
          createdAt,
          updatedAt: createdAt,
        },
        passwordSalt,
        passwordHash: await hashPassword(c.password, passwordSalt),
      }
    }),
  )

  const nfts = kind === 'empty' ? [] : buildNftFixtures()

  // Ana já tem favoritos; Leo não: serve para provar isolamento entre usuários.
  const favorites: Record<string, NftId[]> =
    kind === 'empty'
      ? {}
      : { [FIXTURE_CREDENTIALS.ana.id]: ['emerald-ape-042' as NftId, 'ivory-baron-088' as NftId] }

  const ana = FIXTURE_CREDENTIALS.ana
  // Ana tem carteira principal e de reserva (Figma mobile: "Principal 0xA91F…E82C" e "Reserva nova.kurio.eth").
  // Leo não tem carteiras: exercita o cadastro antes do checkout.
  const wallets: Wallet[] = [
    {
      id: 'wal_ana_primary' as WalletId, userId: ana.id, role: 'primary', displayName: ana.displayName, nickname: 'Principal',
      network: 'ethereum', address: '0xA91F3c5E7b2D4a6F8e1C9b0D2f4A6c8E1b3DE82C', ensName: 'ana.kurio.eth', secondaryReference: null,
      provider: 'metamask', profileName: 'ana.kurio', referralCode: 'KURIO-ANA', email: ana.email, updatedAt: createdAt,
    },
    {
      id: 'wal_ana_secondary' as WalletId, userId: ana.id, role: 'secondary', displayName: ana.displayName, nickname: 'Reserva',
      network: 'polygon', address: '0x5B7d9F1a3C5e7A9b1D3f5A7c9E1b3D5f7A9c2B4D', ensName: 'nova.kurio.eth', secondaryReference: null,
      provider: 'coinbase', profileName: 'ana.kurio', referralCode: 'KURIO-ANA', email: ana.email, updatedAt: createdAt,
    },
  ]

  return {
    schemaVersion: SCHEMA_VERSION, seedKind: kind, users, sessions: [], nfts, favorites, carts: {}, quotes: [],
    wallets, walletConnections: {}, orders: [], idempotency: {},
  }
}