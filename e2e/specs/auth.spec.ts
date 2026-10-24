import { ANA, LEO, expectLoggedIn, fillLogin, login, openLogin } from '../fixtures/auth'
import { isMobile } from '../fixtures/catalog'
import { connectWallet, goToCheckout, openReview } from '../fixtures/checkout'
import { expect, resetScenario, test } from '../fixtures/test'

// Etapa 4 — item 3 (cadastro, login, expiração, logout, troca de usuário) e parte do 11 (diálogo/teclado/validação).

test.beforeEach(async ({ page }) => resetScenario(page))

test.describe('3. login e cadastro', () => {
  test('credenciais inválidas mostram erro; corretas autenticam', async ({ page }) => {
    const form = await openLogin(page)
    await fillLogin(form, { email: ANA.email, password: 'senha-errada' })
    await expect(form.getByRole('alert')).toHaveText(/E-mail ou senha incorretos/)

    await form.getByLabel('Senha', { exact: true }).fill(ANA.password)
    await form.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expectLoggedIn(page, ANA.name)
  })

  test('cadastro: validação no cliente, conflito da API e criação', async ({ page }) => {
    let form
    if (isMobile(page)) {
      await page.goto('/register')
      form = page.getByRole('main')
    } else {
      form = await openLogin(page)
      await form.getByRole('tab', { name: 'Criar conta' }).click()
    }
    const submit = form.getByRole('button', { name: /^Criar (conta|perfil)$/ })

    // Validação no cliente: erro associado ao campo (aria-invalid + aria-describedby)
    await submit.click()
    const email = form.getByRole('textbox', { name: 'E-mail' })
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(email).toHaveAccessibleDescription(/Informe um e-mail válido/)

    // Conflito (409): e-mail já cadastrado volta da API para o campo certo
    await form.getByRole('textbox', { name: 'Nome de usuário' }).fill('novo_colecionador')
    await email.fill(ANA.email)
    await form.getByLabel('Senha', { exact: true }).fill('Senha1234')
    await form.getByLabel('Confirmar senha').fill('Senha1234')
    await submit.click()
    await expect(email).toHaveAccessibleDescription(/já está cadastrado/)
    await expect(email).toBeFocused()

    await email.fill('novo@kurio.dev')
    await submit.click()
    await expect(page.getByText('Conta criada!')).toBeVisible()
  })

  test('redirect externo é ignorado (sem open redirect)', async ({ page }) => {
    await page.goto('/login?redirect=https%3A%2F%2Fexemplo-malicioso.com')
    await fillLogin(page.getByRole('main'), ANA)
    await expect(page).toHaveURL('/')
  })
})

test.describe('3. rotas privadas e expiração', () => {
  test('rota privada exige login e volta para a página pedida', async ({ page }) => {
    await page.goto('/profile/wallets')
    await expect(page).toHaveURL('/login?redirect=%2Fprofile%2Fwallets')
    await fillLogin(page.getByRole('main'), ANA)
    await expect(page).toHaveURL('/profile/wallets')
    await expect(page.getByRole('heading', { name: 'Carteiras', exact: true })).toBeVisible()

    // Já autenticado, /login não faz sentido: segue para o início
    await page.goto('/login')
    await expect(page).toHaveURL('/')
  })

  test('sessão expirada durante a navegação: login com e-mail preenchido e retomada', async ({ page }) => {
    await page.goto('/login?redirect=%2Fprofile')
    await fillLogin(page.getByRole('main'), ANA)
    await expect(page).toHaveURL('/profile')

    await page.evaluate(() => window.__kurioMocks!.expireSession())
    await page.goto('/profile/wallets')

    await expect(page).toHaveURL('/login?redirect=%2Fprofile%2Fwallets')
    await expect(page.getByRole('status').filter({ hasText: 'Sua sessão expirou' })).toBeVisible()
    const form = page.getByRole('main') // o rodapé também tem um campo de e-mail (newsletter)
    await expect(form.getByRole('textbox', { name: 'E-mail' })).toHaveValue(ANA.email)
    await form.getByLabel('Senha', { exact: true }).fill(ANA.password)
    await form.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL('/profile/wallets')
  })

  test('sessão expira durante o checkout: reautentica e retoma com o formulário preenchido', async ({ page }) => {
    await goToCheckout(page)
    await connectWallet(page)
    if (isMobile(page)) await page.getByText('Perfil do colecionador', { exact: false }).first().click()
    const name = page.getByRole('textbox', { name: 'Nome de exibição' })
    await name.fill('Ana Retomada')

    await page.evaluate(() => window.__kurioMocks!.expireSession())
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    const dialog = page.getByRole('dialog', { name: 'Sua sessão expirou' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('textbox', { name: 'E-mail' })).toHaveValue(ANA.email)
    await dialog.getByLabel('Senha', { exact: true }).fill(ANA.password)
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(dialog).toBeHidden()

    // Retomada: a revisão que falhou com 401 é refeita e abre sozinha, com valores do servidor.
    await expect(page).toHaveURL('/checkout')
    const review = page.getByRole('dialog', { name: 'Revise seu pedido' })
    await expect(review.getByTestId('review-total')).toHaveText('1.206 ETH')
    // Mesmo formulário: o que foi digitado continua lá.
    await page.keyboard.press('Escape')
    await expect(review).toBeHidden()
    await expect(name).toHaveValue('Ana Retomada')
    await expect((await openReview(page)).getByTestId('review-total')).toHaveText('1.206 ETH')
  })

  test('sessão expira parada na tela: reautentica sem perder o contexto', async ({ page }) => {
    await page.clock.install()
    await resetScenario(page)
    await page.goto('/?categories=%5B%22musica%22%5D')
    await login(page, ANA)
    const url = page.url()

    await page.clock.fastForward('31:00') // TTL da sessão simulada: 30 min
    const dialog = page.getByRole('dialog', { name: 'Sua sessão expirou' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('textbox', { name: 'E-mail' })).toHaveValue(ANA.email)
    await dialog.getByLabel('Senha', { exact: true }).fill(ANA.password)
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()

    await expect(dialog).toBeHidden()
    expect(page.url()).toBe(url) // continuou na mesma tela, com os mesmos filtros
    await expectLoggedIn(page, ANA.name)
  })

  test('sessão expirada: "continuar como visitante" encerra a sessão', async ({ page }) => {
    await page.clock.install()
    await resetScenario(page)
    await login(page, ANA)
    await page.clock.fastForward('31:00')
    await page.getByRole('button', { name: 'Sair e continuar como visitante' }).click()
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login\?redirect=%2Fprofile$/)
    await expect(page.getByRole('status').filter({ hasText: 'Sua sessão expirou' })).toHaveCount(0)
  })
})

test.describe('3. logout e troca de usuário', () => {
  // No mobile o "Sair" fica no perfil (Etapa 6); aqui o menu do header.
  test.skip(({ page }) => isMobile(page), 'menu do usuário existe só no header (≥ 768px)')

  test('logout e entrada com outro usuário', async ({ page }) => {
    await login(page, ANA)
    await page.getByRole('button', { name: `Conta de ${ANA.name}` }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await expect(page.getByText('Você saiu da sua conta.')).toBeVisible()
    await expect(page.getByRole('banner').getByRole('button', { name: 'Entrar', exact: true })).toBeVisible()

    await login(page, LEO)
    await page.reload() // sessão recuperada após refresh
    await expect(page.getByTestId('user-name')).toHaveText(LEO.name)
  })
})

test.describe('11. teclado e foco no diálogo', () => {
  test.skip(({ page }) => isMobile(page), 'no mobile o login é uma página, não um diálogo')

  test('abre pelo teclado, prende o foco, alterna abas com setas e devolve o foco ao fechar', async ({ page }) => {
    const trigger = page.getByRole('banner').getByRole('button', { name: 'Entrar', exact: true })
    await trigger.focus()
    await page.keyboard.press('Enter')

    const dialog = page.getByRole('dialog') // o nome muda para "Criar conta" ao trocar de aba
    await expect(dialog.getByRole('textbox', { name: 'E-mail' })).toBeFocused()

    // Foco preso: Tab várias vezes nunca sai do diálogo
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true)
    }

    await dialog.getByRole('tab', { name: 'Entrar' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(dialog.getByRole('tab', { name: 'Criar conta' })).toHaveAttribute('aria-selected', 'true')
    await expect(dialog.getByRole('textbox', { name: 'Nome de usuário' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })
})
