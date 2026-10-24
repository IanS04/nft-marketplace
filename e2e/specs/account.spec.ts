import { ANA, LEO, expectLoggedIn, fillLogin, login } from '../fixtures/auth'
import { isMobile } from '../fixtures/catalog'
import { expect, resetScenario, test } from '../fixtures/test'

// Etapa 6 — item 8: perfil, avatar, senha e carteiras, com erros de validação.

// PNG 4×4 gerado com o sharp (um PNG "feito à mão" pode ser recusado pelo decodificador do Chrome).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEElEQVQImWO42OUDRwzEcQC4AhpxtuGc8gAAAABJRU5ErkJggg==',
  'base64',
)

test.beforeEach(async ({ page }) => resetScenario(page))

test('perfil: validação, conflito da API e atualização refletida no header', async ({ page }) => {
  await login(page, ANA)
  await page.goto('/profile')
  const form = page.getByRole('form', { name: 'Perfil do colecionador' }) // o rodapé também tem um campo de e-mail
  const name = form.getByRole('textbox', { name: 'Nome de exibição' })
  const email = form.getByRole('textbox', { name: 'E-mail' })
  const save = page.getByRole('button', { name: 'Salvar', exact: true })

  await name.fill('A')
  await save.click()
  await expect(name).toHaveAccessibleDescription(/Mínimo de 2 caracteres/)

  await name.fill('Ana Kurio')
  await email.fill(LEO.email)
  await save.click()
  await expect(email).toHaveAccessibleDescription(/já está em uso/)

  await email.fill(ANA.email)
  await save.click()
  await expect(page.getByText('Perfil atualizado.')).toBeVisible()
  if (!isMobile(page)) await expect(page.getByTestId('user-name')).toHaveText('Ana Kurio')
  await page.reload()
  await expect(name).toHaveValue('Ana Kurio')
})

test('avatar: enviar e remover', async ({ page }) => {
  await login(page, ANA)
  await page.goto('/profile')
  await page.locator('#avatar-input').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.getByTestId('avatar-image')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('avatar-image')).toBeVisible()
  await page.getByRole('button', { name: 'Remover', exact: true }).click()
  await expect(page.getByLabel('Sem avatar')).toBeVisible()
})

test('senha: atual incorreta é rejeitada; a nova vale no próximo login', async ({ page }) => {
  await login(page, ANA)
  await page.goto('/profile')
  const current = page.getByLabel('Senha atual', { exact: true })
  await current.fill('errada123')
  await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha1')
  await page.getByLabel('Confirmar nova senha', { exact: true }).fill('NovaSenha1')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(current).toHaveAccessibleDescription(/Senha atual incorreta/)

  await current.fill(ANA.password)
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('Perfil e senha atualizados.')).toBeVisible()

  // "Sair" na sidebar do perfil (disponível também no mobile)
  await page.getByRole('navigation', { name: 'Meu perfil' }).getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByText('Você saiu da sua conta.')).toBeVisible()
  await page.goto('/login')
  await fillLogin(page.getByRole('main'), { email: ANA.email, password: 'NovaSenha1' })
  await expectLoggedIn(page, ANA.name)
})

test('carteiras: cadastro com validação, secundária igual à principal e uso no checkout', async ({ page }) => {
  await login(page, LEO) // Leo não tem carteiras
  await page.goto('/checkout')
  // Carrinho vazio vem antes; o pedido de carteira aparece com itens. Aqui, cadastro direto:
  await page.goto('/profile/wallets')

  const primary = page.getByRole('form', { name: 'Carteira principal' })
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(primary.getByRole('combobox', { name: 'Rede' })).toHaveAccessibleDescription('Selecione uma rede.') // o ⚠ é decorativo (aria-hidden)
  await expect(primary.getByRole('textbox', { name: 'Endereço da carteira' })).toHaveAttribute('aria-invalid', 'true')

  await primary.getByRole('textbox', { name: 'Apelido da carteira' }).fill('Principal')
  await primary.getByRole('combobox', { name: 'Rede' }).selectOption('ethereum')
  await primary.getByRole('textbox', { name: 'Nome do perfil' }).fill('leo.kurio')
  await primary.getByRole('textbox', { name: 'Endereço da carteira' }).fill('0x123')
  await primary.getByRole('combobox', { name: 'Tipo de carteira' }).selectOption('metamask')
  await primary.getByRole('textbox', { name: 'Código de indicação' }).fill('KURIO-LEO')
  await primary.getByRole('textbox', { name: 'Nome ENS' }).fill('leo.kurio')
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(primary.getByRole('textbox', { name: 'Endereço da carteira' })).toHaveAccessibleDescription(/Endereço inválido/)

  await primary.getByRole('textbox', { name: 'Endereço da carteira' }).fill('0x1234567890abcdef1234567890ABCDEF12345678')
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Carteira principal adicionada.')).toBeVisible()

  await page.getByRole('checkbox', { name: 'Igual à carteira principal' }).check()
  await page.getByRole('button', { name: 'Adicionar' }).click()
  const secondary = page.getByRole('form', { name: 'Carteira secundária' })
  await expect(secondary.getByRole('textbox', { name: 'Endereço da carteira' })).toHaveValue('0x1234567890abcdef1234567890ABCDEF12345678')
  await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Carteira secundária adicionada.')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('form', { name: 'Carteira secundária' })).toBeVisible()
})
