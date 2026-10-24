import { Link, type LinkProps } from '@tanstack/react-router'
import { Fragment } from 'react'
import { cn } from '@/lib/cn'

export interface Crumb {
  label: string
  /** Sem link = página atual. */
  link?: Pick<LinkProps, 'to' | 'hash' | 'search'>
}

/** "Início / Mercado / Carrinho" (desktop, como no Figma). */
export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Trilha de navegação" className={cn('text-body', className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <Fragment key={item.label}>
            {i > 0 && <li aria-hidden="true" className="text-muted-foreground">/</li>}
            <li>
              {item.link ? (
                <Link {...item.link} className="hover:text-primary">{item.label}</Link>
              ) : (
                <span aria-current="page" className="font-bold">{item.label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
