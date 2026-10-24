import { test as base, expect, type Page } from '@playwright/test'
import type { ScenarioName } from '../../src/mocks/scenarios'

async function waitForMocks(page: Page) {
  // Os controles só são expostos depois de worker.start(): a partir daqui o MSW intercepta.
  await page.waitForFunction(() => !!window.__kurioMocks)
}

/**
 * Estado isolado: reseta o banco simulado no cenário pedido e recarrega a página.
 * `path`: testes só de API usam uma rota sem requisições próprias (a 404) para não consumir as falhas do cenário.
 */
export async function resetScenario(page: Page, scenario: ScenarioName = 'default', path = '/') {
  await page.goto(`${path}?scenario=${scenario}`)
  await waitForMocks(page)
  await page.evaluate((name) => window.__kurioMocks!.reset(name), scenario)
  await page.reload()
  await waitForMocks(page)
}

export interface ApiResult<T = unknown> {
  status: number
  body: T
}

/** fetch executado DENTRO da página: passa pelo service worker e pelos handlers MSW. */
export function callApi<T = unknown>(
  page: Page,
  path: string,
  init: { method?: string; body?: unknown; token?: string } = {},
): Promise<ApiResult<T>> {
  return page.evaluate(async ({ path, init }) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (init.token) headers.Authorization = `Bearer ${init.token}`
    const response = await fetch(path, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
    const text = await response.text()
    return { status: response.status, body: text ? JSON.parse(text) : null }
  }, { path, init }) as Promise<ApiResult<T>>
}

export const test = base
export { expect }
