import type { ImageAsset } from '@/types'

const artwork = (name: 'nft1' | 'nft2' | 'nft3' | 'nft4', alt: string): ImageAsset => ({
  url: `/assets/nfts/${name}-800.webp`,
  srcSet: `/assets/nfts/${name}-400.webp 400w, /assets/nfts/${name}-800.webp 800w`,
  alt,
  width: 800,
  height: 800,
})

/** Artes estáticas das áreas institucionais (hero, banners, diário). O catálogo usa as imagens da API. */
export const ARTWORKS = {
  emerald: artwork('nft2', 'Macaco de óculos redondos e jaqueta college verde, arte da coleção Kurio Apes'),
  nomad: artwork('nft1', 'Gorila de chapéu verde e moletom roxo, arte da coleção Kurio Apes'),
  baron: artwork('nft3', 'Macaco de terno bege e gola alta verde, arte da coleção Kurio Apes'),
  golden: artwork('nft4', 'Macaco dourado com fones de ouvido verdes, arte da coleção Kurio Apes'),
}
