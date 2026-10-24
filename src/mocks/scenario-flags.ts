import type { CheckoutBehavior } from './scenarios'

/** Comportamentos "só na 1ª vez" do cenário ativo. Zerados junto com o reset/troca de cenário. */
const fired = new Set<keyof CheckoutBehavior>()

/** true na primeira chamada para `flag` (se o cenário a ativa); false nas seguintes. */
export function fireOnce(behavior: CheckoutBehavior, flag: keyof CheckoutBehavior): boolean {
  if (!behavior[flag] || fired.has(flag)) return false
  fired.add(flag)
  return true
}

export const resetScenarioFlags = () => fired.clear()
