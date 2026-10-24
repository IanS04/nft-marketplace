import { expectAccessible, expectNoHorizontalOverflow } from '../fixtures/a11y'
import { ANA, login } from '../fixtures/auth'
import { buyFromDetail } from '../fixtures/cart'
import { isMobile } from '../fixtures/catalog'
import { connectWallet, goToCheckout, openReview } from '../fixtures/checkout'
import { expect, resetScenario, test } from '../fixtures/test'

// Etapa 8 — auditoria WCAG 2.2 AA (axe-core) de todas as telas, nos 3 viewports.

test.beforeEach(async ({ page }) => resetScenario(page))

test.describe('auditoria axe: telas públicas', () => {
  test('início', async ({ page }) => {
    await expect(page.getByTestId('nft-grid')).toBeVisible()
    await expectAccessible(page)
  })

  test('detalhe do NFT', async ({ page }) => {
    await page.goto('/nfts/neon-vessel-552') // tem edição esgotada e preço riscado
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectAccessible(page)
  })

  test('carrinho com item', async ({ page }) => {
    await buyFromDetail(page, 'emerald-ape-042')
    await expectAccessible(page)
  })

  test('carrinho vazio, 404 e NFT inexistente', async ({ page }) => {
    await page.goto('/cart')
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
    await expectAccessible(page)
    await page.goto('/nao-existe')
    await expectAccessible(page)
    await page.goto('/nfts/nao-existe-000')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await expectAccessible(page)
  })

  test('login e cadastro (página) com erros de validação', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Entrar', exact: true }).last().click()
    await expectAccessible(page)
    await page.goto('/register')
    await page.getByRole('button', { name: /^Criar (perfil|conta)$/ }).click()
    await expectAccessible(page)
  })

  test('drawer de filtros e modal de login', async ({ page }) => {
    await expect(page.getByTestId('nft-grid')).toBeVisible()
    if (isMobile(page)) {
      await page.getByRole('button', { name: 'Filtros e ordenação' }).click()
      await expectAccessible(page, { include: '[role="dialog"]' })
      return
    }
    await page.getByRole('banner').getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expectAccessible(page, { include: '[role="dialog"]' })
  })
})

test.describe('auditoria axe: telas privadas', () => {
  test('pagamento e revisão do pedido', async ({ page }) => {
    await goToCheckout(page)
    await expectAccessible(page)
    await connectWallet(page)
    await openReview(page)
    await expectAccessible(page, { include: '[role="dialog"]' })
  })

  test('recibo', async ({ page }) => {
    await goToCheckout(page)
    await connectWallet(page)
    await (await openReview(page)).getByRole('button', { name: 'Confirmar pagamento' }).click()
    await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 10_000 })
    await expectAccessible(page)
  })

  test('perfil e carteiras', async ({ page }) => {
    await login(page, ANA)
    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
    await expectAccessible(page)
    await page.goto('/profile/wallets')
    await expect(page.getByRole('form', { name: 'Carteira principal' })).toBeVisible()
    await expectAccessible(page)
  })

  test('lista de interesse, atividade, ofertas, arquivos e suporte', async ({ page }) => {
    await login(page, ANA)
    const sections = [
      ['/profile/favorites', 'Lista de interesse'],
      ['/profile/activity', 'Atividade'],
      ['/profile/offers', 'Ofertas'],
      ['/profile/downloads', 'Arquivos baixados'],
      ['/profile/support', 'Suporte'],
    ] as const
    for (const [path, title] of sections) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
      await expectAccessible(page)
    }
    // Formulário de suporte com erros visíveis.
    await page.getByRole('button', { name: 'Abrir chamado' }).click()
    await expect(page.getByRole('textbox', { name: 'Título' })).toHaveAttribute('aria-invalid', 'true')
    await expectAccessible(page)
  })
})

test.describe('reflow a 320px (zoom de 400%)', () => {
  test.use({ viewport: { width: 320, height: 640 } })


  test('nenhuma tela rola na horizontal', async ({ page }) => {
    // Só no projeto desktop: a emulação mobile (isMobile) "afasta o zoom" e esconderia o overflow.
    test.skip(test.info().project.name !== 'desktop', 'checagem estrita só sem emulação mobile')
    const pages = ['/', '/nfts/emerald-ape-042', '/cart', '/login', '/register', '/nao-existe']
    for (const path of pages) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expectNoHorizontalOverflow(page)
    }
    await login(page, ANA)
    await buyFromDetail(page, 'emerald-ape-042')
    for (const path of ['/cart', '/checkout', '/profile', '/profile/wallets', '/profile/favorites', '/profile/activity', '/profile/offers', '/profile/downloads', '/profile/support']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expectNoHorizontalOverflow(page)
    }
  })
})
