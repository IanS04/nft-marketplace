import { ANA, login } from '../fixtures/auth'
import { buyFromDetail, cartItems, cartTotal } from '../fixtures/cart'
import { isMobile } from '../fixtures/catalog'
import { expect, resetScenario, test } from '../fixtures/test'

// Etapa 5 — item 5: carrinho (quantidades, remoção, cupom, persistência após refresh e login).
// Valores conferidos contra a cotação simulada: taxa de rede Ethereum = 0.016 ETH.

test.beforeEach(async ({ page }) => resetScenario(page))

test('visitante adiciona, altera quantidade e remove; o total vem da cotação', async ({ page }) => {
  await buyFromDetail(page, 'emerald-ape-042')
  await expect(cartItems(page)).toHaveCount(1)
  await expect(cartTotal(page)).toHaveText('1.206 ETH') // 1.19 + 0.016

  const stepper = page.getByRole('group', { name: 'Quantidade de Emerald Ape #042 (1/50)' })
  await stepper.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await expect(stepper.locator('output')).toHaveText('2')
  await expect(cartTotal(page)).toHaveText('2.396 ETH') // 2 × 1.19 + 0.016
  if (!isMobile(page)) await expect(page.getByRole('banner').getByTestId('cart-count')).toHaveText('2')

  await page.getByRole('button', { name: 'Remover Emerald Ape #042 (1/50) do carrinho' }).click()
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
})

test('cupom: inválido, expirado, válido (persiste) e remoção', async ({ page }) => {
  await buyFromDetail(page, 'emerald-ape-042')
  const code = page.getByRole('textbox', { name: 'Código promocional' })
  const apply = page.getByRole('button', { name: 'Aplicar' })

  await code.fill('NAOEXISTE')
  await apply.click()
  await expect(code).toHaveAttribute('aria-invalid', 'true')
  await expect(code).toHaveAccessibleDescription(/Cupom inválido/)

  await code.fill('expirado')
  await apply.click()
  await expect(code).toHaveAccessibleDescription(/Este cupom expirou/)

  await code.fill('kurio10')
  await apply.click()
  await expect(page.getByRole('main').getByText('Cupom KURIO10 aplicado', { exact: true })).toBeVisible()
  await expect(page.getByTestId('cart-summary')).toContainText('(-) 0.119 ETH') // 10% de 1.19
  await expect(cartTotal(page)).toHaveText('1.087 ETH') // 1.19 − 0.119 + 0.016

  await page.reload()
  await expect(cartTotal(page)).toHaveText('1.087 ETH')

  await page.getByRole('button', { name: 'Remover cupom KURIO10' }).click()
  await expect(cartTotal(page)).toHaveText('1.206 ETH')
})

test('carrinho persiste após refresh e é preservado ao entrar', async ({ page }) => {
  await buyFromDetail(page, 'violet-nomad-314')
  await page.reload()
  await expect(cartItems(page)).toHaveCount(1)

  await login(page, ANA)
  await expect(page.getByText('Os itens do seu carrinho foram mantidos.')).toBeVisible()
  await page.goto('/cart')
  await expect(cartItems(page)).toHaveCount(1)
  await expect(cartItems(page)).toContainText('Violet Nomad #314')
  await expect(cartTotal(page)).toHaveText('1.406 ETH')
})

test('disponibilidade: edição 1/1 não passa de 1 unidade', async ({ page }) => {
  await buyFromDetail(page, 'emerald-ape-042', { edition: '1/1' })
  const stepper = page.getByRole('group', { name: 'Quantidade de Emerald Ape #042 (1/1)' })
  await expect(stepper.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()

  await page.goto('/nfts/emerald-ape-042')
  await page.getByRole('radio', { name: '1/1', exact: true }).check()
  await expect(page.getByText('Você já tem o máximo desta edição (1) no carrinho.')).toBeVisible()
  await expect(page.getByRole('button', { name: isMobile(page) ? 'Comprar NFT' : 'Comprar', exact: true })).toBeDisabled()
})

test('rede lenta mostra skeleton no resumo do carrinho', async ({ page }) => {
  await buyFromDetail(page, 'golden-beat-207')
  await resetScenario(page, 'slow-network') // zera o banco: adiciona de novo já com a rede lenta
  await page.goto('/nfts/golden-beat-207')
  await page.getByRole('button', { name: isMobile(page) ? 'Comprar NFT' : 'Comprar', exact: true }).click({ timeout: 15_000 })
  await expect(page).toHaveURL('/cart', { timeout: 15_000 })
  await expect(page.getByTestId('summary-skeleton')).toBeVisible()
  await expect(cartTotal(page)).toHaveText('1.006 ETH', { timeout: 15_000 })
})

test('entrar e recarregar logo em seguida não perde o carrinho do visitante', async ({ page }) => {
  await buyFromDetail(page, 'golden-beat-207')
  await login(page, ANA)
  // Recarrega sem esperar o merge terminar: ele é retomado no carregamento seguinte.
  await page.goto('/cart')
  await expect(cartItems(page)).toContainText('Golden Beat #207')
  await page.reload()
  await expect(cartItems(page)).toHaveCount(1)
})
