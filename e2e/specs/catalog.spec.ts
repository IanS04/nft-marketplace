import { CatalogPage, searchParam } from '../fixtures/catalog'
import { expect, test, resetScenario } from '../fixtures/test'

// Etapa 3 — cobertura dos itens 1 (busca/filtros/ordem/paginação/histórico) e 12 (skeleton, falha e retry).

test.describe('1. catálogo: estado na URL', () => {
  test.beforeEach(async ({ page }) => resetScenario(page))

  test('primeira página reproduz o Figma', async ({ page }) => {
    const catalog = new CatalogPage(page)
    expect((await catalog.names()).slice(0, 3)).toEqual(['Emerald Ape #042', 'Sage Nomad #009', 'Neon Vessel #552'])
    await expect(catalog.grid.getByText('RARO')).toBeVisible()
    await expect(catalog.grid.locator('s')).toHaveText(/2\.29 ETH/)
  })

  test('filtros combinados reiniciam a paginação e o histórico restaura cada estado', async ({ page }) => {
    const catalog = new CatalogPage(page)

    await catalog.goToPage(2)
    await expect.poll(() => searchParam(page, 'page')).toBe(2)
    const page2 = await catalog.names()

    await catalog.toggleFilter('Música')
    await expect.poll(() => searchParam(page, 'categories')).toEqual(['musica'])
    expect(searchParam(page, 'page')).toBeUndefined() // mudança de filtro → página 1

    await catalog.toggleFilter('Jogos')
    await expect.poll(() => searchParam(page, 'categories')).toEqual(['jogos', 'musica'])
    await catalog.toggleFilter('Ethereum')
    await expect.poll(() => searchParam(page, 'networks')).toEqual(['ethereum'])
    const combined = await catalog.names()
    expect(combined.length).toBeGreaterThan(0)
    expect(combined.length).toBeLessThan(9)

    // Refresh mantém tudo
    await page.reload()
    expect(await catalog.names()).toEqual(combined)

    // Voltar desfaz um passo por vez, até a página 2 sem filtros
    await page.goBack()
    await expect.poll(() => searchParam(page, 'networks')).toBeUndefined()
    await page.goBack()
    await expect.poll(() => searchParam(page, 'categories')).toEqual(['musica'])
    await page.goBack()
    await expect.poll(() => searchParam(page, 'page')).toBe(2)
    expect(await catalog.names()).toEqual(page2)

    await page.goForward()
    await expect.poll(() => searchParam(page, 'categories')).toEqual(['musica'])
  })

  test('ordenação por preço', async ({ page }) => {
    const catalog = new CatalogPage(page)
    await catalog.sortBy('Menor preço')
    await expect.poll(() => searchParam(page, 'sort')).toBe('price_asc')
    const asc = await catalog.prices()
    expect(asc).toEqual([...asc].sort((a, b) => a - b))

    await catalog.sortBy('Maior preço')
    await expect.poll(() => searchParam(page, 'sort')).toBe('price_desc')
    const desc = await catalog.prices()
    expect(desc).toEqual([...desc].sort((a, b) => b - a))
  })

  test('busca filtra e pode ser desfeita pelo histórico', async ({ page }) => {
    const catalog = new CatalogPage(page)
    await catalog.search('golden')
    await expect.poll(() => searchParam(page, 'q')).toBe('golden')
    const names = await catalog.names()
    expect(names.length).toBeGreaterThan(0)
    expect(names.every((n) => n.startsWith('Golden'))).toBe(true)

    await page.goBack()
    await expect.poll(() => searchParam(page, 'q')).toBeUndefined()
    expect((await catalog.names())[0]).toBe('Emerald Ape #042')
  })

  test('busca sem resultado mostra estado vazio com "Limpar filtros"', async ({ page }) => {
    const catalog = new CatalogPage(page)
    await catalog.search('nada-com-esse-nome')
    await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros' }).last().click()
    await expect(catalog.grid).toBeVisible()
    expect(searchParam(page, 'q')).toBeUndefined()
  })

  test('URL com página além do fim e valores inválidos é corrigida', async ({ page }) => {
    await page.goto('/?page=99&sort=invalido&categories=%5B%22nao-existe%22%2C%22musica%22%5D')
    const catalog = new CatalogPage(page)
    await expect(catalog.grid).toBeVisible()
    await expect.poll(() => searchParam(page, 'page')).toBeUndefined() // corrigida p/ página 1 (padrão sai da URL)
    expect(searchParam(page, 'categories')).toEqual(['musica'])
  })
})

test.describe('12. carregamento, falha e recuperação', () => {
  test('rede lenta mostra skeletons no lugar da grade', async ({ page }) => {
    await resetScenario(page, 'slow-network')
    await expect(page.getByTestId('nft-grid-loading')).toHaveAttribute('aria-busy', 'true')
    await expect(page.getByTestId('nft-grid-loading').getByTestId('skeleton').first()).toBeVisible()
    await expect(page.getByTestId('nft-grid')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('nft-grid').getByTestId('skeleton')).toHaveCount(0)
  })

  test('timeout: skeleton enquanto espera, erro após estourar o tempo e recuperação', async ({ page }) => {
    // Relógio controlado: os 3 timeouts de 8s (inicial + 2 retries) passam sem esperar 24s de verdade.
    await page.clock.install()
    await resetScenario(page, 'request-timeout')
    await expect(page.getByTestId('nft-grid-loading').getByTestId('skeleton').first()).toBeVisible()
    const alert = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar os NFTs' })
    await expect
      .poll(async () => {
        await page.clock.fastForward(2_000)
        return alert.isVisible()
      }, { timeout: 30_000, intervals: [100] })
      .toBe(true)
    await expect(alert).toContainText('A requisição demorou demais')
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await page.clock.fastForward(1_000) // latência do cenário (80ms)
    await expect(page.getByTestId('nft-grid')).toBeVisible()
  })

  test('falha do servidor mostra erro e "Tentar novamente" recupera', async ({ page }) => {
    await resetScenario(page, 'server-errors') // GET /nfts: 3 falhas (inicial + 2 retries automáticos), a 4ª passa
    const alert = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar os NFTs' })
    await expect(alert).toBeVisible({ timeout: 15_000 })
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByTestId('nft-grid')).toBeVisible()
    await expect(page.getByTestId('live-polite')).toHaveText('36 NFTs encontrados.')
  })

  test('respostas fora de ordem não sobrescrevem o filtro mais recente', async ({ page }) => {
    await resetScenario(page, 'out-of-order') // 1ª requisição por rota lenta (900ms), 2ª rápida
    const catalog = new CatalogPage(page)
    await expect(catalog.grid).toBeVisible()
    await catalog.toggleFilter('Música')
    await catalog.toggleFilter('Jogos')
    await expect.poll(() => searchParam(page, 'categories')).toEqual(['jogos', 'musica'])
    await expect(page.getByTestId('results-count')).toHaveText('8 resultados')
    await page.waitForTimeout(1_200) // tempo para qualquer resposta atrasada chegar
    await expect(page.getByTestId('results-count')).toHaveText('8 resultados')
  })

  test('catálogo vazio', async ({ page }) => {
    await resetScenario(page, 'empty-catalog')
    await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
  })
})

test('rota inexistente mostra 404', async ({ page }) => {
  await page.goto('/rota/que/nao/existe')
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao início' }).click()
  await expect(page.getByTestId('nft-grid')).toBeVisible()
})

test('sem overflow horizontal na largura avaliada', async ({ page }) => {
  await resetScenario(page)
  await expect(page.getByTestId('nft-grid')).toBeVisible()
  // Em emulação mobile, um elemento vazando alarga o layout viewport (innerWidth > largura da tela).
  const { innerWidth, scrollWidth } = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(innerWidth).toBe(page.viewportSize()!.width)
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})
