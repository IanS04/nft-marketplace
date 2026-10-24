import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Item fora do escopo do desafio (editorial, suporte, atividade…). Mantém o visual do Figma,
 * mas não é clicável nem aparenta sucesso: fica esmaecido e anuncia "indisponível".
 */
export function Unavailable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      aria-disabled="true"
      title="Disponível em breve"
      className={cn('cursor-not-allowed opacity-60', className)}
    >
      {children}
      <span className="sr-only"> (indisponível nesta demonstração)</span>
    </span>
  )
}
