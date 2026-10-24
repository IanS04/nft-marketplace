import { Link2, Linkedin, Twitter } from 'lucide-react'
import { toast } from '@/lib/toast'

const iconLink = 'flex size-7 items-center justify-center rounded-sm text-foreground hover:bg-secondary hover:text-primary'

/** Compartilhar: links reais de compartilhamento (nova aba) + copiar link. */
export function ShareLinks({ name }: { name: string }) {
  const url = typeof window !== 'undefined' ? window.location.href : ''
  const text = `${name} na Kurio`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado.')
    } catch {
      toast.error('Não foi possível copiar o link.', { description: url })
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-bold">Compartilhar este NFT:</span>
      <a
        className={iconLink}
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Linkedin className="size-4" aria-hidden="true" />
        <span className="sr-only">Compartilhar no LinkedIn (abre em nova aba)</span>
      </a>
      <a
        className={iconLink}
        href={`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Twitter className="size-4" aria-hidden="true" />
        <span className="sr-only">Compartilhar no X (abre em nova aba)</span>
      </a>
      <button type="button" className={iconLink} onClick={() => void copy()}>
        <Link2 className="size-4" aria-hidden="true" />
        <span className="sr-only">Copiar link</span>
      </button>
    </div>
  )
}
