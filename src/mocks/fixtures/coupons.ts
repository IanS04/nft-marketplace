/** Cupons fictícios (documentados no README). Qualquer outro código é inválido. Também são as "Ofertas" do perfil. */
export interface CouponFixture {
  code: string
  kind: 'percent' | 'fixed'
  /** "10" = 10% · "0.5" = 0.5 ETH */
  value: string
  expired: boolean
  title: string
  description: string
  validUntil: string
}

export const COUPONS: CouponFixture[] = [
  {
    code: 'KURIO10', kind: 'percent', value: '10', expired: false,
    title: '10% de desconto', description: 'Desconto de 10% no subtotal de qualquer carrinho.',
    validUntil: '2099-12-31T23:59:59.000Z',
  },
  {
    code: 'LANCAMENTO', kind: 'fixed', value: '0.5', expired: false,
    title: '0.5 ETH de desconto', description: 'Desconto fixo de lançamento, limitado ao subtotal do carrinho.',
    validUntil: '2099-12-31T23:59:59.000Z',
  },
  {
    code: 'EXPIRADO', kind: 'percent', value: '15', expired: true,
    title: '15% de desconto', description: 'Campanha de inverno encerrada.',
    validUntil: '2026-07-31T23:59:59.000Z',
  },
]

export const findCoupon = (code: string) => COUPONS.find((c) => c.code === code.toUpperCase())
