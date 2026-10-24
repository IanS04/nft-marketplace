import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

/**
 * Auditoria automática (axe-core, o mesmo motor do Lighthouse) com as regras WCAG 2.2 A/AA.
 * Falha listando regra, impacto e elementos — a mensagem já diz o que corrigir.
 */
export async function expectAccessible(page: Page, { include }: { include?: string } = {}) {
  // Espera animações de entrada (diálogos/drawers) terminarem para medir o contraste final.
  await page.waitForTimeout(350)
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
  if (include) builder = builder.include(include)
  const { violations } = await builder.analyze()
  const report = violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 5).map((n) => `${n.target.join(' ')} → ${n.failureSummary?.split('\n').slice(1, 3).join(' ') ?? ''}`),
  }))
  expect(report, `Violações de acessibilidade:\n${JSON.stringify(report, null, 2)}`).toEqual([])
}

/** Reflow (WCAG 1.4.10): sem rolagem horizontal da página. */
export async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth, `A página rola na horizontal (${scrollWidth}px > ${innerWidth}px)`).toBeLessThanOrEqual(innerWidth)
}
