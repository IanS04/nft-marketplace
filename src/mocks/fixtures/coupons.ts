/** Cupons fictícios (documentados no README). Qualquer outro código é inválido. */
export interface CouponFixture {
  code: string
  kind: 'percent' | 'fixed'
  /** "10" = 10% · "0.5" = 0.5 ETH */
  value: string
  expired: boolean
}

export const COUPONS: CouponFixture[] = [
  { code: 'KURIO10', kind: 'percent', value: '10', expired: false },
  { code: 'LANCAMENTO', kind: 'fixed', value: '0.5', expired: false },
  { code: 'EXPIRADO', kind: 'percent', value: '15', expired: true },
]

export const findCoupon = (code: string) => COUPONS.find((c) => c.code === code.toUpperCase())
