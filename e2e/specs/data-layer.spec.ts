import type { AuthSession, NftListResponse } from '../../src/types'
import { callApi, expect, test, resetScenario } from '../fixtures/test'

// Rota sem UI de dados (cai na 404): só as requisições do próprio teste batem nos handlers.
const setup = (page: Parameters<typeof resetScenario>[0], scenario: Parameters<typeof resetScenario>[1] = 'default') =>
  resetScenario(page, scenario, '/__contratos')

// Etapa 2: contratos REST e cenários do MSW, sem UI. Garante a base antes das telas.

const login = async (page: Parameters<typeof callApi>[0], email: string, password: string) => {
  const res = await callApi<AuthSession>(page, '/api/auth/login', { method: 'POST', body: { email, password } })
  expect(res.status).toBe(200)
  return res.body.accessToken
}

test.describe('catálogo', () => {
  test.beforeEach(async ({ page }) => setup(page))

  test('primeira página reproduz o Figma', async ({ page }) => {
    const { status, body } = await callApi<NftListResponse>(page, '/api/nfts')
    expect(status).toBe(200)
    expect(body.pageInfo).toEqual({ page: 1, pageSize: 9, total: 36, totalPages: 4 })
    expect(body.items[0]).toMatchObject({ name: 'Emerald Ape #042', price: '1.19', tokenId: '0042' })
    expect(body.items[2]).toMatchObject({ name: 'Neon Vessel #552', price: '1.99', compareAtPrice: '2.29', rarity: 'raro' })
  })

  test('filtros combinados e ordenação por preço', async ({ page }) => {
    const { status, body } = await callApi<NftListResponse>(page, '/api/nfts?categories=musica,jogos&sort=price_asc&pageSize=48')
    expect(status).toBe(200)
    expect(body.query.categories).toEqual(['jogos', 'musica']) // normalizado: chave de cache estável
    expect(body.items.length).toBeGreaterThan(0)
    expect(body.items.every((n) => n.category === 'musica' || n.category === 'jogos')).toBe(true)
    const prices = body.items.map((n) => Number(n.price))
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  test('parâmetro inválido devolve 422 com fieldErrors', async ({ page }) => {
    const { status, body } = await callApi<{ code: string; fieldErrors: Record<string, string[]> }>(
      page, '/api/nfts?categories=nao-existe&minPrice=2&maxPrice=1',
    )
    expect(status).toBe(422)
    expect(body.code).toBe('VALIDATION_ERROR')
    expect(Object.keys(body.fieldErrors)).toEqual(expect.arrayContaining(['categories.0']))
  })

  test('detalhe inexistente devolve 404', async ({ page }) => {
    const { status, body } = await callApi<{ code: string }>(page, '/api/nfts/nao-existe-000')
    expect(status).toBe(404)
    expect(body.code).toBe('NOT_FOUND')
  })
})

test.describe('auth e favoritos', () => {
  test.beforeEach(async ({ page }) => setup(page))

  test('login com senha errada devolve INVALID_CREDENTIALS', async ({ page }) => {
    const { status, body } = await callApi<{ code: string }>(page, '/api/auth/login', {
      method: 'POST', body: { email: 'ana@kurio.dev', password: 'errada' },
    })
    expect(status).toBe(401)
    expect(body.code).toBe('INVALID_CREDENTIALS')
  })

  test('cadastro com e-mail existente devolve 409 no campo email', async ({ page }) => {
    const { status, body } = await callApi<{ code: string; fieldErrors: Record<string, string[]> }>(
      page, '/api/auth/register', { method: 'POST', body: { username: 'novo_user', email: 'ana@kurio.dev', password: 'Senha1234' } },
    )
    expect(status).toBe(409)
    expect(body.code).toBe('CONFLICT')
    expect(body.fieldErrors.email).toBeDefined()
  })

  test('favoritos isolados por usuário e sem token devolve 401', async ({ page }) => {
    expect((await callApi(page, '/api/favorites')).status).toBe(401)

    const ana = await login(page, 'ana@kurio.dev', 'Kurio@123')
    const leo = await login(page, 'leo@kurio.dev', 'Kurio@456')
    expect((await callApi(page, '/api/favorites', { token: ana })).body).toEqual({ nftIds: ['emerald-ape-042', 'ivory-baron-088'] })
    expect((await callApi(page, '/api/favorites', { token: leo })).body).toEqual({ nftIds: [] })
  })

  test('reset restaura o cenário conhecido', async ({ page }) => {
    const ana = await login(page, 'ana@kurio.dev', 'Kurio@123')
    await callApi(page, '/api/favorites/golden-beat-207', { method: 'PUT', token: ana })
    expect((await callApi<{ nftIds: string[] }>(page, '/api/favorites', { token: ana })).body.nftIds).toHaveLength(3)

    await setup(page)
    const again = await login(page, 'ana@kurio.dev', 'Kurio@123')
    expect((await callApi<{ nftIds: string[] }>(page, '/api/favorites', { token: again })).body.nftIds).toHaveLength(2)
  })
})

test.describe('cenários', () => {
  test('server-errors: GET /nfts falha 3 vezes e a 4ª passa', async ({ page }) => {
    await setup(page, 'server-errors')
    const statuses: number[] = []
    for (let i = 0; i < 4; i++) statuses.push((await callApi(page, '/api/nfts')).status)
    expect(statuses).toEqual([500, 500, 500, 200])
  })

  test('session-expired: 4ª requisição autenticada devolve SESSION_EXPIRED', async ({ page }) => {
    await setup(page, 'session-expired')
    const token = await login(page, 'ana@kurio.dev', 'Kurio@123')
    const results = []
    for (let i = 0; i < 4; i++) results.push(await callApi<{ code?: string }>(page, '/api/favorites', { token }))
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 401])
    expect(results[3]!.body.code).toBe('SESSION_EXPIRED')
  })

  test('empty-catalog: lista vazia', async ({ page }) => {
    await setup(page, 'empty-catalog')
    const { body } = await callApi<NftListResponse>(page, '/api/nfts')
    expect(body.items).toEqual([])
    expect(body.pageInfo.total).toBe(0)
  })
})

test.describe('pedidos: idempotência e isolamento', () => {
  test('mesma chave → mesmo pedido; mesma chave com outro conteúdo → 409; outro usuário → 404', async ({ page }) => {
    await setup(page)
    const ana = await login(page, 'ana@kurio.dev', 'Kurio@123')
    await callApi(page, '/api/cart/items', {
      method: 'POST', token: ana, body: { nftId: 'emerald-ape-042', editionId: 'emerald-ape-042--1of50', quantity: 1 },
    })
    const quote = await callApi<{ id: string; cartVersion: number }>(page, '/api/quote', { method: 'POST', token: ana, body: { network: 'ethereum' } })
    await callApi(page, '/api/wallets/wal_ana_primary/connection', { method: 'POST', token: ana, body: { provider: 'metamask', network: 'ethereum' } })

    const body = {
      quoteId: quote.body.id, cartVersion: quote.body.cartVersion, walletId: 'wal_ana_primary', provider: 'metamask', network: 'ethereum',
      collector: { displayName: 'Ana', username: 'ana_kurio', email: 'ana@kurio.dev', profileName: 'ana.kurio', referralCode: 'KURIO-ANA', ensName: 'ana.kurio.eth' },
    }
    const order = (key: string, payload: unknown) =>
      page.evaluate(async ({ key, payload, token }) => {
        const r = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'Idempotency-Key': key },
          body: JSON.stringify(payload),
        })
        return { status: r.status, body: await r.json() as { id?: string; code?: string } }
      }, { key, payload, token: ana })

    const first = await order('chave-teste-0001', body)
    expect(first.status).toBe(201)
    const retry = await order('chave-teste-0001', body)
    expect(retry.status).toBe(200)
    expect(retry.body.id).toBe(first.body.id) // a mesma tentativa recupera o mesmo pedido

    const conflict = await order('chave-teste-0001', { ...body, collector: { ...body.collector, note: 'outro conteúdo' } })
    expect(conflict.status).toBe(409)
    expect(conflict.body.code).toBe('IDEMPOTENCY_CONFLICT')

    const leo = await login(page, 'leo@kurio.dev', 'Kurio@456')
    expect((await callApi(page, `/api/orders/${first.body.id}`, { token: leo })).status).toBe(404)
    expect((await callApi(page, `/api/orders/${first.body.id}`, { token: ana })).status).toBe(200)
  })
})
