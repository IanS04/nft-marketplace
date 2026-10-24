import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Sem isso o tailwind-merge confunde nossos tamanhos customizados (text-body…) com cor
// e remove um deles em `cn('text-body', 'text-foreground')`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['micro', 'body', 'title', 'heading', 'display'] }],
    },
  },
})

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
