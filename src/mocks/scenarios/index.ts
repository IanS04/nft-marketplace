import { env } from '@/app/env'
import type { ApiErrorCode } from '@/types'

export const SCENARIO_NAMES = [
  'default',
  'empty-catalog',
  'slow-network',
  'variable-latency',
  'out-of-order',
  'server-errors',
  'request-timeout',
  'offline',
  'session-expired',
  'flaky-favorites',
  'price-changed',
  'sold-out-at-checkout',
  'order-timeout',
  'payment-declined',
  'wallet-rejected',
] as const
export type ScenarioName = (typeof SCENARIO_NAMES)[number]

export type LatencyProfile =
  | { mode: 'none' }
  | { mode: 'fixed'; ms: number }
  | { mode: 'variable'; minMs: number; maxMs: number }
  /** Requisições ímpares por rota demoram `slowMs`, as pares `fastMs`: a resposta antiga chega depois da nova. */
  | { mode: 'out-of-order'; slowMs: number; fastMs: number }

export interface FaultRule {
  id: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Testado contra o caminho relativo à API (ex.: "/nfts"). */
  path: RegExp
  kind: 'network-error' | 'http-error' | 'timeout'
  status?: number
  code?: ApiErrorCode
  message?: string
  retryable?: boolean
  /** Ignora as N primeiras ocorrências que casarem. */
  skip?: number
  /** Quantas vezes dispara depois do skip (omitido = sempre). */
  times?: number
}

/** Comportamentos do checkout. Os marcados "1ª vez" disparam uma vez por carregamento do cenário. */
export interface CheckoutBehavior {
  /** 1ª vez: ao criar o pedido, o preço do 1º item sobe 10% → 409 QUOTE_STALE. */
  priceChangeOnOrder?: boolean
  /** 1ª vez: ao criar o pedido, a edição do 1º item esgota → 409 AVAILABILITY_CONFLICT. */
  soldOutOnOrder?: boolean
  /** 1ª vez: o pedido é CRIADO, mas a resposta nunca chega (timeout do cliente). */
  timeoutAfterCreate?: boolean
  /** O pagamento é recusado na liquidação (pedido → rejected). */
  declinePayment?: boolean
  /** 1ª vez: a carteira recusa a conexão. */
  rejectWalletConnection?: boolean
}

export interface ScenarioConfig {
  name: ScenarioName
  description: string
  seed: { catalog: 'full' | 'empty' }
  latency: LatencyProfile
  auth: { expireAfterRequests?: number }
  checkout: CheckoutBehavior
  faults: FaultRule[]
}

const scenario = (
  name: ScenarioName,
  description: string,
  overrides: Partial<Omit<ScenarioConfig, 'name' | 'description'>> = {},
): ScenarioConfig => ({
  name,
  description,
  seed: { catalog: 'full' },
  latency: { mode: 'fixed', ms: 80 },
  auth: {},
  checkout: {},
  faults: [],
  ...overrides,
})

export const SCENARIOS: Record<ScenarioName, ScenarioConfig> = {
  default: scenario('default', 'Sucesso, latência baixa e fixa (80ms). Usado em demo, Lighthouse e regressão visual.'),
  'empty-catalog': scenario('empty-catalog', 'Catálogo vazio (resultado vazio em qualquer busca).', {
    seed: { catalog: 'empty' },
  }),
  'slow-network': scenario('slow-network', 'Latência fixa de 1,5s: exercita skeletons.', {
    latency: { mode: 'fixed', ms: 1_500 },
  }),
  'variable-latency': scenario('variable-latency', 'Latência pseudoaleatória (determinística) entre 100ms e 1,2s.', {
    latency: { mode: 'variable', minMs: 100, maxMs: 1_200 },
  }),
  'out-of-order': scenario('out-of-order', 'Respostas fora de ordem: 1ª requisição por rota lenta, 2ª rápida.', {
    latency: { mode: 'out-of-order', slowMs: 900, fastMs: 120 },
  }),
  'server-errors': scenario('server-errors', 'GET /nfts devolve 500 nas 3 primeiras chamadas (inicial + 2 retries); a 4ª funciona.', {
    faults: [
      { id: 'nfts-500', method: 'GET', path: /^\/nfts$/, kind: 'http-error', status: 500, code: 'TRANSIENT', times: 3 },
    ],
  }),
  'request-timeout': scenario('request-timeout', 'GET /nfts não responde nas 3 primeiras chamadas (inicial + 2 retries): o cliente estoura o timeout de 8s; a 4ª funciona.', {
    faults: [{ id: 'nfts-timeout', method: 'GET', path: /^\/nfts$/, kind: 'timeout', times: 3 }],
  }),
  offline: scenario('offline', 'Toda requisição falha na conexão.', {
    faults: [{ id: 'offline', path: /.*/, kind: 'network-error' }],
  }),
  'session-expired': scenario('session-expired', 'A sessão expira na 4ª requisição autenticada (401 SESSION_EXPIRED).', {
    auth: { expireAfterRequests: 3 },
  }),
  'flaky-favorites': scenario('flaky-favorites', 'A 1ª mutation de favoritos falha com 503; a seguinte funciona.', {
    faults: [
      // Só as mutations (PUT/DELETE /favorites/:id): a leitura GET /favorites/nfts não consome a falha.
      { id: 'fav-503', path: /^\/favorites\/(?!nfts$)/, kind: 'http-error', status: 503, code: 'TRANSIENT', times: 1 },
    ],
  }),
  'price-changed': scenario('price-changed', 'Na 1ª tentativa de pedido o preço sobe 10%: o checkout exige nova confirmação.', {
    checkout: { priceChangeOnOrder: true },
  }),
  'sold-out-at-checkout': scenario('sold-out-at-checkout', 'Na 1ª tentativa de pedido a edição do 1º item esgota.', {
    checkout: { soldOutOnOrder: true },
  }),
  'order-timeout': scenario('order-timeout', 'O 1º pedido é criado, mas a resposta não chega (timeout). O reenvio com a mesma chave recupera o mesmo pedido.', {
    checkout: { timeoutAfterCreate: true },
  }),
  'payment-declined': scenario('payment-declined', 'O pagamento é recusado: o pedido termina como "rejected" e o carrinho é preservado.', {
    checkout: { declinePayment: true },
  }),
  'wallet-rejected': scenario('wallet-rejected', 'A 1ª conexão de carteira é recusada; a seguinte funciona.', {
    checkout: { rejectWalletConnection: true },
  }),
}

/* ---------- Estado do cenário ativo ---------- */

export const SCENARIO_STORAGE_KEY = 'kurio:mock-scenario'
let current: ScenarioName = 'default'

export const isScenarioName = (value: unknown): value is ScenarioName =>
  typeof value === 'string' && (SCENARIO_NAMES as readonly string[]).includes(value)

export const getScenario = (): ScenarioConfig => SCENARIOS[current]

export function setScenario(name: ScenarioName): void {
  current = name
  try { localStorage.setItem(SCENARIO_STORAGE_KEY, name) } catch { /* ignora */ }
}

/** Prioridade: ?scenario= na URL → último escolhido (localStorage) → VITE_MOCK_SCENARIO → default. */
export function resolveInitialScenario(search = window.location.search): ScenarioName {
  const fromUrl = new URLSearchParams(search).get('scenario')
  if (isScenarioName(fromUrl)) return fromUrl
  let stored: string | null = null
  try { stored = localStorage.getItem(SCENARIO_STORAGE_KEY) } catch { /* ignora */ }
  if (isScenarioName(stored)) return stored
  return isScenarioName(env.VITE_MOCK_SCENARIO) ? env.VITE_MOCK_SCENARIO : 'default'
}