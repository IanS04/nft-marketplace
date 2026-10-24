import type { Page } from '@playwright/test'
import { ANA, login } from '../fixtures/auth'
import { buyFromDetail } from '../fixtures/cart'
import { isMobile, searchParam } from '../fixtures/catalog'
import { connectWallet, goToCheckout } from '../fixtures/checkout'
import { realtime } from '../fixtures/realtime'
import { expect, resetScenario, test } from '../fixtures/test'

// Etapa 8 — item 11: navegação por teclado, foco visível, foco em diálogos/drawers e validação.

const activeElementInfo = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    return { id: el?.id ?? '', text: el?.textContent?.trim() ?? '', inDialog: !!el?.closest('[role="dialog"]') }
  })

test.beforeEach(async ({ page }) => resetScenario(page))

test('skip link é o 1º foco e leva ao conteúdo principal; o foco é visível', async ({ page }) => {
  await expect(page.getByTestId('nft-grid')).toBeVisible()
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
  await expect(skip).toBeFocused()
  await expect(skip).toBeVisible() // sr-only até receber foco
  await page.keyboard.press('Enter')
  await expect.poll(async () => (await activeElementInfo(page)).id).toBe('conteudo')

  // Próximo Tab cai num elemento com anel de foco (box-shadow do ring)
  await page.keyboard.press('Tab')
  const ring = await page.evaluate(() => getComputedStyle(document.activeElement!).boxShadow)
  expect(ring).not.toBe('none')
})

test('ordenação pelo teclado (select acessível)', async ({ page }) => {
  test.skip(isMobile(page), 'no mobile a ordenação fica no drawer (testado abaixo)')
  const sort = page.getByRole('combobox', { name: 'Ordenar por:' })
  await sort.focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect.poll(() => searchParam(page, 'sort')).toBe('price_asc')
  await expect(sort).toBeFocused() // o foco volta ao gatilho
})

test('drawer de filtros: foco preso, Esc fecha e devolve o foco', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) >= 1024, 'no desktop os filtros ficam na sidebar')
  const trigger = page.getByRole('button', { name: isMobile(page) ? 'Filtros e ordenação' : 'Filtros', exact: true })
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Filtros' })).toBeVisible()
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab')
    expect((await activeElementInfo(page)).inDialog).toBe(true)
  }
  // Aplica um filtro pelo teclado: Espaço no botão "Música"
  await page.getByRole('dialog').getByRole('button', { name: /^Música/ }).focus()
  await page.keyboard.press('Space')
  await expect.poll(() => searchParam(page, 'categories')).toEqual(['musica'])
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('detalhe: edição com setas e quantidade com o teclado', async ({ page }) => {
  await page.goto('/nfts/emerald-ape-042')
  const edition50 = page.getByRole('radio', { name: '1/50' })
  await edition50.focus()
  await page.keyboard.press('ArrowLeft') // rádios nativos: setas trocam a seleção
  await expect(page.getByRole('radio', { name: '1/10', exact: true })).toBeChecked()

  const stepper = page.getByRole('group', { name: 'Quantidade de Emerald Ape #042' })
  await stepper.getByRole('button', { name: 'Aumentar quantidade' }).focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Space')
  await expect(stepper.locator('output')).toHaveText('3')
})

test('menu do usuário pelo teclado', async ({ page }) => {
  test.skip(isMobile(page), 'no mobile a conta fica na tab bar / sidebar do perfil')
  await login(page, ANA)
  await page.getByRole('button', { name: `Conta de ${ANA.name}` }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menu')).toBeVisible()
  // Padrão WAI-ARIA de menu: abrir com Enter já foca o 1º item
  await expect(page.getByRole('menuitem', { name: 'Meu perfil' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'Carteiras' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/profile/wallets')
})

test('validação: o foco vai para o primeiro campo com erro e a mensagem está associada', async ({ page }) => {
  await page.goto('/register')
  const form = page.getByRole('form', { name: 'Criar conta' })
  await form.getByRole('button', { name: /^Criar (perfil|conta)$/ }).click()
  const username = form.getByRole('textbox', { name: 'Nome de usuário' })
  await expect(username).toBeFocused()
  await expect(username).toHaveAttribute('aria-invalid', 'true')
  await expect(username).toHaveAccessibleDescription(/Mínimo de 3 caracteres/)
})

test('revisão do pedido: foco preso no diálogo e Esc devolve o foco ao "Confirmar compra"', async ({ page }) => {
  await goToCheckout(page)
  await connectWallet(page)
  const confirm = page.getByRole('button', { name: 'Confirmar compra' })
  await confirm.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Revise seu pedido' })
  await expect(dialog.getByTestId('review-total')).toBeVisible()
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab')
    expect((await activeElementInfo(page)).inDialog).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(confirm).toBeFocused()
})

test('feedback acessível: mudança em tempo real é anunciada na live region', async ({ page }) => {
  await page.goto('/nfts/sage-nomad-009')
  await expect(page.getByRole('heading', { level: 1, name: 'Sage Nomad #009' })).toBeVisible()
  await realtime(page).ready()
  await realtime(page).changePrice('sage-nomad-009', '2.10')
  await expect(page.getByTestId('live-polite')).toHaveText('Sage Nomad #009 foi atualizado: 2.10 ETH.')
})

test.describe('movimento reduzido', () => {
  test.use({ reducedMotion: 'reduce' })

  test('skeleton sem animação de shimmer', async ({ page }) => {
    await resetScenario(page, 'slow-network')
    const skeleton = page.getByTestId('nft-grid-loading').getByTestId('skeleton').first()
    await expect(skeleton).toBeVisible()
    await expect.poll(() => skeleton.evaluate((el) => getComputedStyle(el, '::after').animationName)).toBe('none')
  })
})

test('carrinho: remover item pelo teclado anuncia o resultado', async ({ page }) => {
  await buyFromDetail(page, 'emerald-ape-042')
  await page.getByRole('button', { name: 'Remover Emerald Ape #042 (1/50) do carrinho' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Emerald Ape #042 removido do carrinho.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
})
