import { ANA, LEO, login } from '../fixtures/auth'
import { favoriteToggle } from '../fixtures/cart'
import { isMobile } from '../fixtures/catalog'
import { expect, resetScenario, test } from '../fixtures/test'

// Etapa 5 — itens 2 (detalhe: acesso direto e inexistente) e 4 (favoritos, falha e recuperação).

test.describe('2. detalhe do NFT', () => {
  test.beforeEach(async ({ page }) => resetScenario(page))

  test('acesso direto mostra dados, galeria e edições', async ({ page }) => {
    await page.goto('/nfts/emerald-ape-042')
    await expect(page).toHaveTitle('Emerald Ape #042 · Kurio')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByText('1.19 ETH').filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByRole('radio', { name: '1/50' })).toBeChecked() // padrão do Figma
    await expect(page.getByText('ID do token:')).toBeVisible()
  })

  test('NFT inexistente mostra "não encontrado"', async ({ page }) => {
    await page.goto('/nfts/nao-existe-000')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await page.getByRole('link', { name: 'Explorar o catálogo' }).click()
    await expect(page.getByTestId('nft-grid')).toBeVisible()
  })

  test('edição esgotada fica indisponível', async ({ page }) => {
    await page.goto('/nfts/neon-vessel-552')
    await expect(page.getByRole('radio', { name: '1/1 (esgotada)' })).toBeDisabled()
  })

  test('quantidade respeita o limite da edição', async ({ page }) => {
    await page.goto('/nfts/emerald-ape-042')
    await page.getByRole('radio', { name: '1/10', exact: true }).check()
    const stepper = page.getByRole('group', { name: 'Quantidade de Emerald Ape #042' })
    const plus = stepper.getByRole('button', { name: 'Aumentar quantidade' })
    for (let i = 0; i < 9; i++) await plus.click()
    await expect(stepper.locator('output')).toHaveText('10')
    await expect(plus).toBeDisabled()
    await expect(page.getByText('Máximo de 10 por pedido nesta edição.')).toBeVisible()
  })

  test('rede lenta mostra o skeleton do detalhe', async ({ page }) => {
    await resetScenario(page, 'slow-network')
    await page.goto('/nfts/sage-nomad-009')
    await expect(page.getByLabel('Carregando NFT')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Sage Nomad #009' })).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('4. favoritos', () => {
  test('visitante é convidado a entrar', async ({ page }) => {
    await resetScenario(page)
    await page.goto('/nfts/golden-beat-207')
    await favoriteToggle(page, 'Golden Beat #207').click()
    if (isMobile(page)) await expect(page).toHaveURL(/\/login\?redirect=/)
    else await expect(page.getByRole('dialog', { name: 'Entrar' })).toBeVisible()
  })

  test('favoritar persiste após refresh e não vaza para outro usuário', async ({ page }) => {
    await resetScenario(page)
    await login(page, ANA)

    await page.goto('/nfts/emerald-ape-042')
    await expect(favoriteToggle(page, 'Emerald Ape #042')).toHaveAttribute('aria-pressed', 'true') // favorito da fixture

    await page.goto('/nfts/golden-beat-207')
    const toggle = favoriteToggle(page, 'Golden Beat #207')
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await toggle.click()
    // A UI otimista muda na hora; esperamos a confirmação do servidor (anúncio) antes do refresh.
    await expect(page.getByTestId('live-polite')).toHaveText('Golden Beat #207 adicionado aos favoritos.')
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')

    // Troca de usuário: os favoritos da Ana não podem aparecer para o Leo.
    if (isMobile(page)) {
      // No mobile o "Sair" chega com o perfil (Etapa 6): encerra a sessão pelo armazenamento.
      await page.evaluate(() => localStorage.removeItem('kurio:session'))
      await page.reload()
    } else {
      await page.getByRole('button', { name: `Conta de ${ANA.name}` }).click()
      await page.getByRole('menuitem', { name: 'Sair' }).click()
      await expect(page.getByText('Você saiu da sua conta.')).toBeVisible() // logout concluído antes de navegar
      await page.goto('/nfts/golden-beat-207')
    }
    await login(page, LEO)
    await page.goto('/nfts/golden-beat-207')
    await expect(favoriteToggle(page, 'Golden Beat #207')).toHaveAttribute('aria-pressed', 'false')
  })

  test('falha da mutation desfaz a mudança otimista e a nova tentativa funciona', async ({ page }) => {
    await resetScenario(page, 'flaky-favorites') // 1ª mutation de favoritos: 503
    await login(page, ANA)
    await page.goto('/nfts/golden-beat-207')
    const toggle = favoriteToggle(page, 'Golden Beat #207')

    await toggle.click()
    await expect(page.getByText('Não foi possível favoritar Golden Beat #207.')).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false') // rollback

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('live-polite')).toHaveText('Golden Beat #207 adicionado aos favoritos.')
    await page.reload()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })
})
