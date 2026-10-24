import { ZoomIn } from 'lucide-react'
import { useState } from 'react'
import { NftImage } from '@/components/nft/nft-image'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/cn'
import type { ImageAsset } from '@/types'

/** Galeria: miniaturas (desktop) + imagem principal com zoom em diálogo. */
export function NftGallery({ images, name, className }: { images: ImageAsset[]; name: string; className?: string }) {
  const [index, setIndex] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)
  const current = images[index] ?? images[0]
  if (!current) return null

  return (
    <div className={cn('grid gap-4 md:grid-cols-[4.5rem_minmax(0,1fr)]', className)}>
      <ul aria-label="Imagens do NFT" className="hidden flex-col gap-3 md:flex">
        {images.map((image, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-pressed={i === index}
              aria-label={`Ver imagem ${i + 1} de ${images.length}`}
              className={cn(
                'block aspect-square w-full overflow-hidden rounded-lg border-2 transition-colors',
                i === index ? 'border-primary' : 'border-transparent hover:border-primary/50',
              )}
            >
              <NftImage image={{ ...image, alt: '' }} sizes="4.5rem" />
            </button>
          </li>
        ))}
      </ul>

      <div className="relative aspect-square overflow-hidden bg-secondary md:rounded-xl">
        <NftImage image={current} sizes="(min-width: 1024px) 26rem, (min-width: 768px) 45vw, 100vw" priority />
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          aria-label="Ampliar imagem"
          className="absolute right-3 top-3 hidden size-9 items-center justify-center rounded-full bg-background/60 text-foreground backdrop-blur hover:bg-background md:flex"
        >
          <ZoomIn className="size-5" aria-hidden="true" />
        </button>
      </div>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-3xl p-3" aria-describedby={undefined}>
          <DialogTitle className="sr-only">{name}: imagem ampliada</DialogTitle>
          <NftImage image={current} sizes="48rem" className="rounded-lg" />
        </DialogContent>
      </Dialog>
    </div>
  )
}
