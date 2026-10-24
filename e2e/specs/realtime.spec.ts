import { LEO, login } from '../fixtures/auth'
import { buyFromDetail, cartTotal } from '../fixtures/cart'
import { connectWallet, countOrders, goToCheckout, openReview } from '../fixtures/checkout'
import { realtime, toasts } from '../fixtures/realtime'
import { expect, resetScenario, test } from '../fixtures/test'

// Etapa 7 — itens 9 (preço/disponibilidade via Socket.IO durante o checkout) e 10 (duplicados,
// antigos, desconexão e retomada de pedido pendente). Tudo passa pelo socket.io-client real.

test.beforeEach(async ({ page }) => resetScenario(page))

test.describe('9. mudanças em tempo real', () => {
  test('preço muda com o NFT no carrinho: a interface avisa e o resumo é recalculado', async ({ page }) => {
    await buyFromDetail(page, 'emerald-ape-042')
    await expect(cartTotal(page)).toHaveText('1.206 ETH')
    const rt = realtime(page)
    await rt.ready()

    await rt.changePrice('emerald-ape-042', '1.50')
    await expect(toasts(page, 'Preço atualizado: Emerald Ape #042')).toBeVisible()
    await expect(cartTotal(page)).toHaveText('1.516 ETH') // 1.50 + 0.016, vindo da nova cotação
  })

  test('o catálogo atualiza o preço sem recarregar', async ({ page }) => {
    const grid = page.getByTestId('nft-grid')
    await expect(grid).toBeVisible()
    await realtime(page).ready()
    await realtime(page).changePrice('sage-nomad-009', '2.00')
    await expect(grid.locator('article', { hasText: 'Sage Nomad #009' })).toContainText('2.00 ETH')
  })

  test('checkout não confirma com cotação desatualizada: exige nova confirmação', async ({ page }) => {
    await goToCheckout(page)
    await connectWallet(page)
    const rt = realtime(page)
    await rt.ready()
    const review = await openReview(page)
    await expect(review.getByTestId('review-total')).toHaveText('1.206 ETH')

    await rt.changePrice('emerald-ape-042', '1.50') // muda com a revisão aberta
    await review.getByRole('button', { name: 'Confirmar pagamento' }).click()
    await expect(review.getByRole('alert').first()).toContainText('Os valores mudaram')
    await expect(review.getByTestId('review-total')).toHaveText('1.516 ETH')

    await review.getByRole('button', { name: 'Confirmar com os novos valores' }).click()
    await expect(page.getByTestId('receipt-total')).toHaveText('1.516 ETH', { timeout: 10_000 })
  })

  test('edição esgota durante o checkout: aviso e confirmação bloqueada', async ({ page }) => {
    await goToCheckout(page)
    await realtime(page).ready()
    await realtime(page).changeStock('emerald-ape-042--1of50', 0)
    await expect(toasts(page, 'esgotou')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
    await expect(page.getByRole('link', { name: 'Ajustar carrinho' })).toBeVisible()
  })
})

test.describe('10. robustez dos eventos', () => {
  test('evento duplicado e evento antigo são ignorados (sem regredir nem repetir efeitos)', async ({ page }) => {
    await buyFromDetail(page, 'emerald-ape-042')
    const rt = realtime(page)
    await rt.ready()
    await rt.changePrice('emerald-ape-042', '1.50')
    await expect(cartTotal(page)).toHaveText('1.516 ETH')

    await rt.replayLast() // mesmo eventId
    await rt.emitStale('emerald-ape-042', '0.10') // versão anterior, preço "velho"
    await page.waitForTimeout(800)
    await expect(toasts(page, 'Preço atualizado: Emerald Ape #042')).toHaveCount(1)
    await expect(cartTotal(page)).toHaveText('1.516 ETH')
  })

  test('queda de conexão com pedido pendente: ao reconectar, o estado é recuperado sem nova compra', async ({ page }) => {
    await goToCheckout(page)
    const rt = realtime(page)
    await rt.setSettleDelay(1_500)
    await connectWallet(page)
    await (await openReview(page)).getByRole('button', { name: 'Confirmar pagamento' }).click()
    await expect(page.getByTestId('order-pending')).toBeVisible()

    await rt.setOnline(false)
    await expect(page.getByTestId('realtime-offline')).toBeVisible()
    await page.waitForTimeout(2_500) // o pedido é liquidado no servidor, mas o evento não chega
    await expect(page.getByTestId('order-pending')).toBeVisible()

    await rt.setOnline(true)
    await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByTestId('realtime-offline')).toBeHidden()
    expect(await countOrders(page)).toBe(1)
  })

  test('refresh com pedido pendente: retoma e recebe a confirmação pelo socket', async ({ page }) => {
    await goToCheckout(page)
    const rt = realtime(page)
    await rt.setSettleDelay(4_000)
    await connectWallet(page)
    await (await openReview(page)).getByRole('button', { name: 'Confirmar pagamento' }).click()
    await expect(page.getByTestId('order-pending')).toBeVisible()

    await page.reload()
    await expect(page.getByTestId('order-pending')).toBeVisible()
    await expect(toasts(page, 'Pagamento confirmado!')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('order-receipt')).toBeVisible()
    expect(await countOrders(page)).toBe(1)
  })

  test('evento privado de outro usuário não afeta a sessão atual', async ({ page }) => {
    await login(page, LEO)
    await realtime(page).ready()
    await realtime(page).emitForeignOrder('usr_ana')
    await page.waitForTimeout(800)
    await expect(toasts(page, 'Pagamento confirmado!')).toHaveCount(0)
  })
})
