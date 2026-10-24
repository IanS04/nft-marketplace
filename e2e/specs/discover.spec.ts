import { isMobile } from '../fixtures/catalog'
import { expect, resetScenario, test } from '../fixtures/test'

// Abas "Criadores" e "Aprenda" (desktop: header; mobile: rodapé).

test.beforeEach(async ({ page }) => resetScenario(page))

test('criadores: lista, perfil com processo e coleção, ida e volta pelo NFT', async ({ page }) => {
  if (isMobile(page)) {
    await page.getByRole('contentinfo').getByRole('link', { name: 'Criadores em destaque' }).click()
  } else {
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Criadores' }).click()
  }
  await expect(page).toHaveURL('/creators')
  const list = page.getByTestId('creators-list')
  await expect(list.getByRole('listitem')).toHaveCount(4)
  for (const name of ['Marina Okada', 'Rafael Duarte', 'Helena Vasconcelos', 'Caio Mendes']) {
    await expect(list.getByRole('link', { name })).toBeVisible()
  }

  await list.getByRole('link', { name: 'Marina Okada' }).click()
  await expect(page).toHaveURL('/creators/marina-okada')
  await expect(page.getByRole('heading', { level: 1, name: 'Marina Okada' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Como Marina cria um NFT' })).toBeVisible()
  await expect(page.getByText('5% nas revendas', { exact: true })).toBeVisible()
  // A estatística vem da API e bate com a coleção exibida.
  const cards = page.getByTestId('creator-nfts').getByRole('listitem')
  await expect(cards.first()).toBeVisible()
  await expect(page.getByTestId('creator-nft-count')).toHaveText(String(await cards.count()))

  await page.getByTestId('creator-nfts').getByRole('link', { name: 'Emerald Ape #042' }).click()
  await expect(page).toHaveURL('/nfts/emerald-ape-042')
  await page.getByRole('link', { name: 'Marina Okada' }).click()
  await expect(page).toHaveURL('/creators/marina-okada')
})

test('criador inexistente mostra "não encontrado"', async ({ page }) => {
  await page.goto('/creators/nao-existe')
  await expect(page.getByRole('heading', { name: 'Criador não encontrado' })).toBeVisible()
  await page.getByRole('link', { name: 'Ver todos os criadores' }).click()
  await expect(page).toHaveURL('/creators')
})

test('aprenda: sumário com âncoras, passos de compra e perguntas frequentes', async ({ page }) => {
  if (isMobile(page)) {
    await page.getByRole('contentinfo').getByRole('link', { name: 'Como comprar NFTs' }).click()
    await expect(page).toHaveURL('/learn#como-comprar')
  } else {
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Aprenda' }).click()
    await expect(page).toHaveURL('/learn')
    await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Aprenda' })).toHaveAttribute('aria-current', 'page')
  }
  await expect(page.getByRole('heading', { level: 1, name: 'Aprenda sobre NFTs' })).toBeVisible()

  await page.getByRole('navigation', { name: 'Nesta página' }).getByRole('link', { name: 'Edições e raridade' }).click()
  await expect(page).toHaveURL('/learn#edicoes')
  await expect(page.getByRole('heading', { name: 'Edições e raridade' })).toBeInViewport()

  const steps = page.locator('#como-comprar').getByRole('listitem')
  await expect(steps).toHaveCount(6)

  const faq = page.getByText('Esta compra é real?')
  await faq.click()
  await expect(page.getByText('Este mercado é uma demonstração')).toBeVisible()

  await page.locator('#como-comprar').getByRole('link', { name: 'Abrir o catálogo' }).click()
  await expect(page).toHaveURL('/#catalogo')
})
