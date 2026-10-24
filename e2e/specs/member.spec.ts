import { ANA, LEO, login } from '../fixtures/auth'
import { buyFromDetail, favoriteToggle } from '../fixtures/cart'
import { isMobile } from '../fixtures/catalog'
import { connectWallet, openReview } from '../fixtures/checkout'
import { expect, resetScenario, test } from '../fixtures/test'

// Seções da sidebar "Meu perfil": lista de interesse, atividade, arquivos baixados, ofertas e suporte.

test.describe('lista de interesse', () => {
  test('mostra os favoritos, desfavoritar remove (persiste) e não vaza para outro usuário', async ({ page }) => {
    await resetScenario(page)
    await login(page, ANA)
    if (isMobile(page)) {
      // No mobile, o coração da barra inferior leva à lista.
      await page.getByRole('navigation', { name: 'Navegação inferior' }).getByRole('link', { name: 'Lista de interesse' }).click()
    } else {
      await page.goto('/profile')
      await page.getByRole('navigation', { name: 'Meu perfil' }).getByRole('link', { name: 'Lista de interesse' }).click()
    }
    await expect(page).toHaveURL('/profile/favorites')
    const grid = page.getByTestId('favorites-grid')
    await expect(grid.getByRole('link', { name: 'Emerald Ape #042' })).toBeVisible()
    await expect(grid.getByRole('link', { name: 'Ivory Baron #088' })).toBeVisible()

    await favoriteToggle(page, 'Ivory Baron #088').click()
    await expect(grid.getByRole('link', { name: 'Ivory Baron #088' })).toBeHidden() // otimista
    await expect(page.getByTestId('live-polite')).toHaveText('Ivory Baron #088 removido dos favoritos.')
    await page.reload()
    await expect(grid.getByRole('link', { name: 'Emerald Ape #042' })).toBeVisible()
    await expect(grid.getByRole('link', { name: 'Ivory Baron #088' })).toBeHidden()

    // Outro usuário: lista própria (vazia), nada da Ana.
    await page.getByRole('navigation', { name: 'Meu perfil' }).getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL('/')
    await login(page, LEO)
    await page.goto('/profile/favorites')
    await expect(page.getByRole('heading', { name: 'Sua lista de interesse está vazia' })).toBeVisible()
  })

  test('falha ao desfavoritar devolve o item à lista (rollback)', async ({ page }) => {
    await resetScenario(page, 'flaky-favorites') // 1ª mutation de favoritos: 503
    await login(page, ANA)
    await page.goto('/profile/favorites')
    const card = page.getByTestId('favorites-grid').getByRole('link', { name: 'Emerald Ape #042' })
    await expect(card).toBeVisible()
    await favoriteToggle(page, 'Emerald Ape #042').click()
    await expect(page.getByText('Não foi possível remover Emerald Ape #042 dos favoritos.')).toBeVisible()
    await expect(card).toBeVisible()
  })
})

test('compra confirmada: arte disponível para baixar e histórico na atividade', async ({ page }) => {
  await resetScenario(page)
  await login(page, ANA)
  await page.goto('/profile/activity')
  await expect(page.getByRole('heading', { name: 'Nenhuma atividade ainda' })).toBeVisible()
  await page.goto('/profile/downloads')
  await expect(page.getByRole('heading', { name: 'Nenhum arquivo disponível' })).toBeVisible()

  await buyFromDetail(page, 'emerald-ape-042')
  await page.goto('/checkout')
  await expect(page.getByTestId('checkout-total')).toBeVisible()
  await connectWallet(page)
  await (await openReview(page)).getByRole('button', { name: 'Confirmar pagamento' }).click()
  await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 10_000 })

  await page.goto('/profile/downloads')
  const list = page.getByTestId('downloads-list')
  await expect(list.getByRole('heading', { name: /Emerald Ape #042/ })).toBeVisible()
  await expect(list.getByTestId('download-count')).toHaveText('ainda não baixado')
  const downloadEvent = page.waitForEvent('download')
  await list.getByRole('button', { name: 'Baixar Emerald Ape #042' }).click()
  expect((await downloadEvent).suggestedFilename()).toMatch(/^emerald-ape-042-.+\.webp$/)
  await expect(list.getByTestId('download-count')).toHaveText(/^baixado 1×/)
  await page.reload()
  await expect(list.getByTestId('download-count')).toHaveText(/^baixado 1×/) // registrado na API

  await page.goto('/profile/activity')
  const activity = page.getByTestId('activity-list')
  await expect(activity.getByText('Arquivo baixado')).toBeVisible()
  await expect(activity.getByText('Pagamento confirmado')).toBeVisible()
  await expect(activity.getByText('Pedido enviado')).toBeVisible()
  await activity.getByRole('link', { name: 'Ver pedido' }).first().click()
  await expect(page.getByTestId('order-receipt')).toBeVisible()
})

test('ofertas: cupom expirado bloqueado, válido aplicado no carrinho', async ({ page }) => {
  await resetScenario(page)
  await login(page, ANA)
  await buyFromDetail(page, 'emerald-ape-042')
  await page.goto('/profile/offers')
  const offers = page.getByTestId('offers-list')
  await expect(offers.getByRole('listitem')).toHaveCount(3)
  await expect(offers.getByRole('button', { name: 'Expirado' })).toBeDisabled()

  await offers.getByRole('button', { name: 'Aplicar no carrinho cupom KURIO10' }).click()
  await expect(page.getByTestId('live-polite')).toHaveText('Cupom KURIO10 aplicado ao seu carrinho.')
  await expect(offers.getByText('Aplicado no carrinho')).toBeVisible()
  await offers.getByRole('link', { name: 'Ver carrinho' }).click()
  await expect(page).toHaveURL('/cart')
  // O resumo do carrinho (o toast e a live region repetem a frase fora do <main>).
  await expect(page.getByRole('main').getByText(/^Cupom\s+KURIO10\s+aplicado$/)).toBeVisible()
})

test('suporte: validação, chamado com protocolo, persistência e atividade', async ({ page }) => {
  await resetScenario(page)
  await login(page, ANA)
  await page.goto('/profile/support')
  await expect(page.getByRole('heading', { name: 'Nenhum chamado aberto' })).toBeVisible()
  const form = page.getByRole('form', { name: 'Novo chamado' })
  const subject = form.getByRole('textbox', { name: 'Título' })
  const message = form.getByRole('textbox', { name: 'Mensagem' })

  await form.getByRole('button', { name: 'Abrir chamado' }).click()
  await expect(form.getByRole('combobox', { name: 'Assunto' })).toHaveAccessibleDescription('Escolha um assunto.')
  await expect(subject).toHaveAccessibleDescription('Mínimo de 5 caracteres.')

  await form.getByRole('combobox', { name: 'Assunto' }).selectOption({ label: 'Carteira' })
  await subject.fill('Carteira não conecta')
  await message.fill('Curto demais')
  await form.getByRole('button', { name: 'Abrir chamado' }).click()
  await expect(message).toHaveAccessibleDescription('Descreva com pelo menos 20 caracteres.')

  await message.fill('A conexão com a MetaMask falhou duas vezes antes de funcionar.')
  await form.getByRole('button', { name: 'Abrir chamado' }).click()
  await expect(page.getByTestId('live-polite')).toHaveText('Chamado KUR-001001 aberto.')
  const tickets = page.getByTestId('tickets-list')
  await expect(tickets.getByRole('heading', { name: 'Carteira não conecta' })).toBeVisible()
  await expect(subject).toHaveValue('') // formulário limpo para o próximo

  await page.reload()
  await expect(tickets.getByText('KUR-001001')).toBeVisible()
  await page.goto('/profile/activity')
  await expect(page.getByTestId('activity-list').getByText('Chamado KUR-001001 aberto')).toBeVisible()
})

test('seções da conta exigem login', async ({ page }) => {
  await resetScenario(page)
  for (const path of ['/profile/favorites', '/profile/activity', '/profile/offers', '/profile/downloads', '/profile/support']) {
    await page.goto(path)
    await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent(path)}`)
  }
})
