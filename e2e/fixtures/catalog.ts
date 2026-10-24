import { expect, type Locator, type Page } from '@playwright/test'

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768
const hasSidebar = (page: Page) => (page.viewportSize()?.width ?? 1440) >= 1024

/** Interações do catálogo independentes do viewport (sidebar no desktop, drawer no tablet/mobile). */
export class CatalogPage {
  constructor(readonly page: Page) {}

  get grid(): Locator {
    return this.page.getByTestId('nft-grid')
  }

  /** Nomes dos NFTs exibidos na grade, na ordem. */
  async names(): Promise<string[]> {
    await expect(this.grid).toHaveAttribute('aria-busy', 'false')
    return this.grid.getByRole('heading', { level: 3 }).allInnerTexts()
  }

  /** Primeiro preço (o atual, não o riscado) de cada card. */
  async prices(): Promise<number[]> {
    await expect(this.grid).toHaveAttribute('aria-busy', 'false')
    const texts = await this.grid.locator('article p span:first-child').allInnerTexts()
    return texts.map((t) => Number(t.replace(' ETH', '')))
  }

  /** Abre o painel de filtros do viewport atual e executa `action` dentro dele. */
  async withFilters(action: (panel: Locator) => Promise<void>) {
    if (hasSidebar(this.page)) {
      await action(this.page.getByRole('complementary', { name: 'Filtros do catálogo' }))
      return
    }
    await this.page.getByRole('button', { name: isMobile(this.page) ? 'Filtros e ordenação' : 'Filtros', exact: true }).click()
    const dialog = this.page.getByRole('dialog', { name: 'Filtros' })
    await action(dialog)
    await dialog.getByRole('button', { name: /^Ver/ }).click()
    await expect(dialog).toBeHidden()
  }

  async toggleFilter(label: string) {
    await this.withFilters((panel) => panel.getByRole('button', { name: new RegExp(`^${label}`) }).click())
  }

  async sortBy(label: string) {
    const choose = async (scope: Page | Locator) => {
      // <select> nativo: escolhe a opção pelo texto visível
      await scope.getByRole('combobox', { name: 'Ordenar por:' }).selectOption({ label })
    }
    if (isMobile(this.page)) await this.withFilters(choose)
    else await choose(this.page)
  }

  async search(term: string) {
    if (isMobile(this.page)) {
      await this.page.getByRole('searchbox', { name: 'Explorar coleções' }).fill(term)
    } else {
      await this.page.getByRole('button', { name: 'Abrir busca' }).click()
      await this.page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill(term)
      await this.page.keyboard.press('Enter')
    }
  }

  async goToPage(n: number) {
    await this.page.getByRole('navigation', { name: 'Paginação do catálogo' }).getByRole('link', { name: `Página ${n}`, exact: true }).click()
  }
}

/** Lê um search param da URL. Arrays vêm em JSON (formato do router): devolve ordenado. */
export function searchParam(page: Page, key: string): unknown {
  const raw = new URL(page.url()).searchParams.get(key)
  if (raw === null) return undefined
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) ? [...value].sort() : value
  } catch {
    return raw
  }
}
