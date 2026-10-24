import { expect, type Page } from '@playwright/test'
import { ANA, login } from './auth'
import { buyFromDetail } from './cart'
import { callApi } from './test'

/** Login + 1 NFT no carrinho + página de pagamento carregada. */
export async function goToCheckout(page: Page, { user = ANA, nftId = 'emerald-ape-042' } = {}) {
  await login(page, user)
  await buyFromDetail(page, nftId)
  await page.goto('/checkout')
  await expect(page.getByTestId('checkout-total')).toBeVisible()
}

export async function connectWallet(page: Page, provider = 'MetaMask') {
  await page.getByRole('button', { name: `Conectar ${provider}` }).click()
  await expect(page.getByTestId('wallet-connection')).toContainText('Conectada')
}

/** "Confirmar compra" → diálogo de revisão com valores conferidos no servidor. */
export async function openReview(page: Page) {
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  const dialog = page.getByRole('dialog', { name: 'Revise seu pedido' })
  await expect(dialog.getByTestId('review-total')).toBeVisible()
  return dialog
}

/** Quantos pedidos o usuário logado tem (consulta a API simulada com o token da sessão). */
export async function countOrders(page: Page): Promise<number> {
  const token = await page.evaluate(() => {
    const raw = localStorage.getItem('kurio:session')
    return raw ? (JSON.parse(raw) as { session?: { accessToken?: string } }).session?.accessToken : undefined
  })
  const { body } = await callApi<{ items: unknown[] }>(page, '/api/orders', { token })
  return body.items.length
}
