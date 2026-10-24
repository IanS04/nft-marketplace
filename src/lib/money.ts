import Decimal from 'decimal.js'
import type { DecimalString, EthAmount } from '@/types'

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP })

const DECIMAL_RE = /^\d+(\.\d+)?$/
export const ETH_SCALE = 18

const d = (value: Decimal.Value) => new Decimal(value)
const out = (value: Decimal): EthAmount => value.toDecimalPlaces(ETH_SCALE).toFixed() as EthAmount

export const isDecimalString = (value: unknown): value is DecimalString =>
  typeof value === 'string' && DECIMAL_RE.test(value)

/** Normaliza qualquer valor não negativo para string decimal (sem notação científica). */
export function eth(value: Decimal.Value): EthAmount {
  const x = d(value)
  if (!x.isFinite() || x.isNegative()) throw new RangeError(`Valor ETH inválido: ${String(value)}`)
  return out(x)
}

export const ZERO: EthAmount = eth(0)

export const add = (...values: EthAmount[]): EthAmount =>
  out(values.reduce((acc, v) => acc.plus(v), new Decimal(0)))

export function sub(a: EthAmount, b: EthAmount): EthAmount {
  const result = d(a).minus(b)
  if (result.isNegative()) throw new RangeError('Resultado negativo em valor ETH')
  return out(result)
}

export function mulQty(price: EthAmount, quantity: number): EthAmount {
  if (!Number.isInteger(quantity) || quantity < 0) throw new RangeError('Quantidade deve ser inteira ≥ 0')
  return out(d(price).times(quantity))
}

export const percentOf = (amount: EthAmount, percent: string): EthAmount =>
  out(d(amount).times(percent).div(100))

export const markup = (amount: EthAmount, percent: number, decimals = 2): EthAmount =>
  out(d(amount).times(100 + percent).div(100).toDecimalPlaces(decimals))

export const compare = (a: EthAmount, b: EthAmount): -1 | 0 | 1 => d(a).cmp(b) as -1 | 0 | 1
export const isZero = (a: EthAmount) => d(a).isZero()

/** Mantém toda a precisão recebida; só garante no mínimo 2 casas ("1.19", "26.846", "0.016"). */
export function formatEth(value: EthAmount, minDecimals = 2): string {
  const x = d(value)
  return x.toFixed(Math.max(x.decimalPlaces(), minDecimals))
}

export const formatEthWithUnit = (value: EthAmount) => `${formatEth(value)} ETH`
/*
 * Sliders só trabalham com inteiros: convertemos ETH em "passos" (ex.: centésimos).
 * O número resultante é uma CONTAGEM de passos, não um valor em ETH.
 */
export const toSteps = (amount: EthAmount, step = '0.01', round: 'floor' | 'ceil' = 'floor'): number =>
  d(amount).div(step)[round]().toNumber()

export const fromSteps = (steps: number, step = '0.01'): EthAmount => eth(d(step).times(steps))
