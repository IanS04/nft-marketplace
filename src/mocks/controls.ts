import { resetChaos } from './chaos'
import { DB_STORAGE_KEY, mockDb } from './db/db'
import { DEFAULT_SETTLE_MS, setSettleDelay } from './domain/orders'
import { realtimeControls, realtimeHub } from './realtime/hub'
import {
  getScenario, isScenarioName, SCENARIO_NAMES, SCENARIO_STORAGE_KEY, setScenario, type ScenarioName,
} from './scenarios'

/** API de controle para Playwright e demonstração: window.__kurioMocks */
export interface KurioMockControls {
  readonly scenarios: readonly ScenarioName[]
  scenario(): ScenarioName
  setScenario(name: ScenarioName): void
  /** Reseta o banco e limpa dados "kurio:*" do navegador (sessão, carrinho, chaves). Recarregue a página depois. */
  reset(name?: ScenarioName): Promise<void>
  /** Marca todas as sessões como expiradas: a próxima requisição autenticada recebe 401 SESSION_EXPIRED. */
  expireSession(): void
  /** Prazo (ms) até a rede simulada liquidar pedidos NOVOS. Padrão 2000. */
  setSettleDelay(ms: number): void
  /** Disparo de eventos Socket.IO pelo servidor simulado (mudam o banco E emitem o evento). */
  realtime: typeof realtimeControls
}

declare global {
  interface Window { __kurioMocks?: KurioMockControls }
}

function clearClientStorage() {
  try {
    const keep = new Set([SCENARIO_STORAGE_KEY, DB_STORAGE_KEY])
    Object.keys(localStorage)
      .filter((key) => key.startsWith('kurio:') && !keep.has(key))
      .forEach((key) => localStorage.removeItem(key))
  } catch { /* ignora */ }
}

export function exposeControls(): void {
  window.__kurioMocks = {
    scenarios: SCENARIO_NAMES,
    scenario: () => getScenario().name,
    setScenario(name) {
      if (!isScenarioName(name)) throw new Error(`Cenário desconhecido: ${String(name)}`)
      setScenario(name)
      resetChaos()
    },
    async reset(name) {
      if (name) setScenario(name)
      resetChaos()
      clearClientStorage()
      setSettleDelay(DEFAULT_SETTLE_MS)
      realtimeHub.reset()
      await mockDb.reset(getScenario().seed.catalog)
    },
    expireSession() {
      mockDb.write((db) => { db.sessions.forEach((s) => { s.expired = true }) })
    },
    setSettleDelay,
    realtime: realtimeControls,
  }
}
