import { expect, type Page } from '@playwright/test'
import { isMobile } from './catalog'

/** Detalhe → (edição) → Comprar → carrinho. */
export async function buyFromDetail(page: Page, nftId: string, { edition }: { edition?: string } = {}) {
  await page.goto(`/nfts/${nftId}`)
  if (edition) await page.getByRole('radio', { name: edition, exact: true }).check()
  await page.getByRole('button', { name: isMobile(page) ? 'Comprar NFT' : 'Comprar', exact: true }).click()
  await expect(page).toHaveURL('/cart')
  await expect(page.getByTestId('cart-total')).toBeVisible()
}

export const cartTotal = (page: Page) => page.getByTestId('cart-total')
export const cartItems = (page: Page) => page.getByTestId('cart-item')

/** Botão de favoritar do detalhe (desktop: "Favoritar"/"Favoritado"; mobile: ícone sobre a imagem). */
export const favoriteToggle = (page: Page, name: string) =>
  page.getByRole('main').getByRole('button', { name: new RegExp(`^Favorit(ar|ado) ${name.replace('#', '\\#')}$`) })
