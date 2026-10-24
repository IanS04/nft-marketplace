import type { ReactNode } from 'react'

/** Título das seções do perfil (mesmo padrão de "Perfil do colecionador"). */
export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1">
        <h1 className="text-title">{title}</h1>
        {description && <p className="text-micro text-primary">{description}</p>}
      </div>
      {action}
    </header>
  )
}
