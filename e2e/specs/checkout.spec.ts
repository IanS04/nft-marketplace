import { ANA, login } from '../fixtures/auth'
import { buyFromDetail, cartItems } from '../fixtures/cart'
import { isMobile } from '../fixtures/catalog'
import { connectWallet, countOrders, goToCheckout, openReview } from '../fixtures/checkout'
import { expect, resetScenario, test } from '../fixtures/test'

// Etapa 6 — itens 6 (compra completa) e 7 (falha, clique repetido, timeout) + revalidação no checkout.

test('6. compra completa: catálogo → detalhe → carrinho → pagamento → recibo', async ({ page }) => {
  await resetScenario(page)
  await login(page, ANA)
  await page.goto('/')
  await page.getByTestId('nft-grid').getByRole('link', { name: 'Emerald Ape #042' }).click()
  await page.getByRole('button', { name: isMobile(page) ? 'Comprar NFT' : 'Comprar', exact: true }).click()
  await expect(page).toHaveURL('/cart')
  await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL('/checkout')

  // Formulário já vem preenchido com perfil + carteira principal (no mobile fica recolhido: abrimos para conferir)
  if (isMobile(page)) await page.getByText('Perfil do colecionador', { exact: false }).first().click()
  await expect(page.getByRole('textbox', { name: 'Nome de exibição' })).toHaveValue(ANA.name)
  await connectWallet(page)
  const review = await openReview(page)
  await expect(review.getByTestId('review-total')).toHaveText('1.206 ETH')
  await review.getByRole('button', { name: 'Confirmar pagamento' }).click()

  await expect(page.getByTestId('order-pending')).toBeVisible()
  const receipt = page.getByTestId('order-receipt')
  await expect(receipt).toBeVisible({ timeout: 10_000 })
  await expect(receipt.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
  await expect(receipt.getByTestId('receipt-total')).toHaveText('1.206 ETH')
  await expect(receipt.getByTestId('tx-id')).toHaveText(/^0x[0-9a-f]{4}…[0-9a-f]{4}$/)

  // O recibo sobrevive ao refresh e o que foi comprado saiu do carrinho
  await page.reload()
  await expect(page.getByTestId('receipt-total')).toHaveText('1.206 ETH')
  await page.goto('/cart')
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
})

test.describe('7. falhas do pagamento', () => {
  test('pagamento recusado mostra o motivo e preserva o carrinho', async ({ page }) => {
    await resetScenario(page, 'payment-declined')
    await goToCheckout(page)
    await connectWallet(page)
    await (await openReview(page)).getByRole('button', { name: 'Confirmar pagamento' }).click()

    const rejected = page.getByTestId('order-rejected')
    await expect(rejected).toBeVisible({ timeout: 10_000 })
    await expect(rejected).toContainText('O pagamento foi recusado')
    await rejected.getByRole('link', { name: 'Ver carrinho' }).click()
    await expect(cartItems(page)).toHaveCount(1)
  })

  test('clique repetido não duplica o pedido', async ({ page }) => {
    await resetScenario(page)
    await goToCheckout(page)
    await connectWallet(page)
    const review = await openReview(page)
    await review.getByRole('button', { name: 'Confirmar pagamento' }).dblclick()
    await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 10_000 })
    expect(await countOrders(page)).toBe(1)
  })

  test('timeout depois de criar o pedido: o reenvio recupera o MESMO pedido', async ({ page }) => {
    test.setTimeout(60_000)
    await resetScenario(page, 'order-timeout')
    await goToCheckout(page)
    await connectWallet(page)
    await (await openReview(page)).getByRole('button', { name: 'Confirmar pagamento' }).click()

    // O Axios desiste após 8s; o fluxo reenvia com a mesma Idempotency-Key.
    await expect(page.getByText('Não recebemos a resposta. Verificando seu pedido…').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 20_000 })
    expect(await countOrders(page)).toBe(1)
  })
})

test.describe('revalidação antes de confirmar', () => {
  test('preço alterado durante a compra exige nova confirmação', async ({ page }) => {
    await resetScenario(page, 'price-changed')
    await goToCheckout(page)
    await connectWallet(page)
    const review = await openReview(page)
    await review.getByRole('button', { name: 'Confirmar pagamento' }).click()

    // 1.19 + 10% = 1.31 → total 1.326 ETH
    await expect(review.getByRole('alert').first()).toContainText('Os valores mudaram')
    await expect(review.getByTestId('review-total')).toHaveText('1.326 ETH')
    await review.getByRole('button', { name: 'Confirmar com os novos valores' }).click()
    await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('receipt-total')).toHaveText('1.326 ETH')
  })

  test('edição esgotada no checkout bloqueia a confirmação', async ({ page }) => {
    await resetScenario(page, 'sold-out-at-checkout')
    await goToCheckout(page)
    await connectWallet(page)
    const review = await openReview(page)
    await review.getByRole('button', { name: 'Confirmar pagamento' }).click()
    await expect(review.getByText(/esgotou/).first()).toBeVisible()
    await expect(review.getByRole('button', { name: /^Confirmar/ })).toBeDisabled()
    await review.getByRole('link', { name: 'Ajustar carrinho' }).click()
    await expect(page.getByText('Esgotado: remova para continuar.')).toBeVisible()
    expect(await countOrders(page)).toBe(0)
  })

  test('carteira recusa a conexão e a nova tentativa conecta', async ({ page }) => {
    await resetScenario(page, 'wallet-rejected')
    await goToCheckout(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByText('Conecte a carteira (MetaMask) para confirmar a compra.')).toBeVisible()

    await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
    await expect(page.getByTestId('wallet-connection')).toContainText('A carteira recusou a conexão')
    await page.getByRole('button', { name: 'Tentar conectar novamente' }).click()
    await expect(page.getByTestId('wallet-connection')).toContainText('Conectada')
    await page.getByRole('button', { name: 'Desconectar' }).click()
    await expect(page.getByTestId('wallet-connection')).toContainText('Carteira desconectada')
  })
})

test('sem sessão, o pagamento exige login', async ({ page }) => {
  await resetScenario(page)
  await buyFromDetail(page, 'violet-nomad-314')
  await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL('/login?redirect=%2Fcheckout')
})
