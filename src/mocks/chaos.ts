import { delay, HttpResponse, type DefaultBodyType, type HttpResponseResolver, type PathParams } from 'msw'
import { mulberry32 } from './prng'
import { resetScenarioFlags } from './scenario-flags'
import { relativeApiPath } from './api-path'
import { apiError } from './http-utils'
import { getScenario, type LatencyProfile } from './scenarios'

const CHAOS_SEED = 1337
let rng = mulberry32(CHAOS_SEED)
const sequence = new Map<string, number>()
const hits = new Map<string, number>()

export function resetChaos(): void {
  rng = mulberry32(CHAOS_SEED)
  sequence.clear()
  hits.clear()
  resetScenarioFlags()
}

async function waitLatency(path: string, profile: LatencyProfile): Promise<void> {
  switch (profile.mode) {
    case 'none':
      return
    case 'fixed':
      await delay(profile.ms)
      return
    case 'variable':
      await delay(Math.round(profile.minMs + rng() * (profile.maxMs - profile.minMs)))
      return
    case 'out-of-order': {
      const n = (sequence.get(path) ?? 0) + 1
      sequence.set(path, n)
      await delay(n % 2 === 1 ? profile.slowMs : profile.fastMs)
      return
    }
  }
}

/** Aplica latência e falhas do cenário ativo. Devolve uma resposta se uma falha disparar. */
export async function applyNetworkConditions(request: Request): Promise<Response | undefined> {
  const scenario = getScenario()
  const path = relativeApiPath(new URL(request.url).pathname)

  await waitLatency(path, scenario.latency)

  for (const rule of scenario.faults) {
    if (rule.method && rule.method !== request.method) continue
    if (!rule.path.test(path)) continue

    const count = (hits.get(rule.id) ?? 0) + 1
    hits.set(rule.id, count)
    const skip = rule.skip ?? 0
    if (count <= skip) continue
    if (rule.times !== undefined && count > skip + rule.times) continue

    switch (rule.kind) {
      case 'network-error':
        return HttpResponse.error()
      case 'timeout':
        await delay('infinite')
        return undefined
      case 'http-error':
        return apiError(
          rule.code ?? 'TRANSIENT',
          rule.message ?? 'Falha temporária. Tente novamente.',
          rule.status ?? 503,
          { retryable: rule.retryable },
        )
    }
  }
  return undefined
}

/** Envolve um resolver para que TODO handler passe pelas condições de rede do cenário. */
export function withConditions<
  Params extends PathParams = PathParams,
  Body extends DefaultBodyType = DefaultBodyType,
>(resolver: HttpResponseResolver<Params, Body>): HttpResponseResolver<Params, Body> {
  return async (info) => (await applyNetworkConditions(info.request)) ?? resolver(info)
}