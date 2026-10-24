import type { UserId } from '@/types'

export interface FixtureCredential {
  id: UserId
  email: string
  username: string
  displayName: string
  /** Só existe aqui (documentado no README). O banco guarda apenas hash + salt. */
  password: string
}

// Dois usuários fictícios: Ana tem favoritos, Leo não (prova o isolamento entre contas).
export const FIXTURE_CREDENTIALS = {
  ana: {
    id: 'usr_ana' as UserId,
    email: 'ana@kurio.dev',
    username: 'ana_kurio',
    displayName: 'Ana Colecionadora',
    password: 'Kurio@123',
  },
  leo: {
    id: 'usr_leo' as UserId,
    email: 'leo@kurio.dev',
    username: 'leo_kurio',
    displayName: 'Leo Colecionador',
    password: 'Kurio@456',
  },
} satisfies Record<string, FixtureCredential>
