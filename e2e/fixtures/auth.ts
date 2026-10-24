import { expect, type Locator, type Page } from '@playwright/test'
import { isMobile } from './catalog'

export const ANA = { email: 'ana@kurio.dev', password: 'Kurio@123', name: 'Ana Colecionadora' }
export const LEO = { email: 'leo@kurio.dev', password: 'Kurio@456', name: 'Leo Colecionador' }

/** Desktop: modal aberto pelo header. Mobile: página /login (não há header no mobile). */
export async function openLogin(page: Page): Promise<Locator> {
  if (isMobile(page)) {
    await page.goto('/login')
    return page.getByRole('main')
  }
  await page.getByRole('banner').getByRole('button', { name: 'Entrar', exact: true }).click()
  // Sem filtrar pelo nome: o título acessível muda ao trocar para a aba "Criar conta".
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  return dialog
}

export async function fillLogin(scope: Locator, user: { email: string; password: string }) {
  await scope.getByRole('textbox', { name: 'E-mail' }).fill(user.email)
  await scope.getByLabel('Senha', { exact: true }).fill(user.password)
  await scope.getByRole('button', { name: 'Entrar', exact: true }).click()
}

/** Confirma o login pela interface: toast de boas-vindas (+ nome no header, no desktop). */
export async function expectLoggedIn(page: Page, name: string) {
  await expect(page.getByText(`Olá, ${name}!`)).toBeVisible()
  if (!isMobile(page)) await expect(page.getByTestId('user-name')).toHaveText(name)
}

export async function login(page: Page, user: typeof ANA) {
  await fillLogin(await openLogin(page), user)
  await expectLoggedIn(page, user.name)
}
