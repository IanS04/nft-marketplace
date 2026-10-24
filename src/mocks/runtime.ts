import { mockDb } from './db/db'
import { getScenario, resolveInitialScenario, setScenario } from './scenarios'

export async function initMockRuntime(): Promise<void> {
  setScenario(resolveInitialScenario())
  await mockDb.init(getScenario().seed.catalog)
}

export { exposeControls } from './controls'
export { startSettlementTicker } from './realtime/hub'
