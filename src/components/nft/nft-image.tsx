import { cn } from '@/lib/cn'
import type { ImageAsset } from '@/types'

interface NftImageProps {
  image: ImageAsset
  /** Largura exibida em cada breakpoint: o navegador escolhe a variação 400w/800w certa. */
  sizes: string
  /** Imagem acima da dobra (LCP): carrega já, com prioridade alta. */
  priority?: boolean
  className?: string
}

export function NftImage({ image, sizes, priority = false, className }: NftImageProps) {
  return (
    <img
      src={image.url}
      srcSet={image.srcSet}
      sizes={image.srcSet ? sizes : undefined}
      alt={image.alt}
      width={image.width}
      height={image.height}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className={cn('size-full object-cover', className)}
    />
  )
}
