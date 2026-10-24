import type { Blockchain } from '@/types'

/**
 * Criadores fictícios: um por arte do Figma (cada um assina um "modelo"). Nomes, cidades e
 * trajetórias são inventados, genéricos de propósito, mas distintos entre si.
 */
export type ArtworkKey = 'nft1' | 'nft2' | 'nft3' | 'nft4'

export interface CreatorFixture {
  id: string
  name: string
  handle: string
  role: string
  location: string
  memberSince: string
  artwork: ArtworkKey
  modelName: string
  royaltyPercent: string
  preferredNetwork: Blockchain
  tagline: string
  bio: string
  tools: string[]
  process: { title: string; text: string }[]
}

export const CREATORS: CreatorFixture[] = [
  {
    id: 'marina-okada',
    name: 'Marina Okada',
    handle: '@marina.okada',
    role: 'Ilustradora digital',
    location: 'São Paulo, SP',
    memberSince: '2024-03-12T10:00:00.000Z',
    artwork: 'nft2',
    modelName: 'Retrato com acessórios (óculos e jaqueta college)',
    royaltyPercent: '5',
    preferredNetwork: 'ethereum',
    tagline: 'Retratos de personagens com acessórios que contam uma história.',
    bio:
      'Trabalhou oito anos com ilustração editorial antes de migrar para colecionáveis digitais. ' +
      'Cada peça parte de um esboço a lápis e termina com textura pintada à mão no tablet.',
    tools: ['Procreate', 'Photoshop', 'Lápis 2B e papel'],
    process: [
      { title: 'Esboço', text: 'Define silhueta e expressão em papel; só digitaliza o que funciona em miniatura.' },
      { title: 'Pintura digital', text: 'Camadas separadas para pele, roupa e acessórios, para gerar as variações de traços.' },
      { title: 'Metadados', text: 'Descreve cada atributo (óculos, cor da jaqueta) antes da cunhagem, para filtros e raridade.' },
      { title: 'Cunhagem', text: 'Publica na Ethereum em edições 1/1, 1/10 e 1/50, com royalties de 5% nas revendas.' },
    ],
  },
  {
    id: 'rafael-duarte',
    name: 'Rafael Duarte',
    handle: '@rafaduarte.art',
    role: 'Designer de personagens',
    location: 'Recife, PE',
    memberSince: '2024-07-28T14:30:00.000Z',
    artwork: 'nft1',
    modelName: 'Streetwear (chapéu bucket e moletom)',
    royaltyPercent: '7.5',
    preferredNetwork: 'polygon',
    tagline: 'Personagens com cara de rua, cores fortes e roupas que viram assinatura.',
    bio:
      'Vem do design de estampas para marcas independentes. Trouxe para os NFTs a lógica de coleção ' +
      'de moda: uma base única e drops com variações de cor e peças.',
    tools: ['Illustrator', 'Figma', 'Clip Studio Paint'],
    process: [
      { title: 'Moodboard', text: 'Reúne referências de moda de rua e define a paleta da temporada.' },
      { title: 'Base vetorial', text: 'Desenha o personagem em vetor para trocar roupas e cores sem redesenhar.' },
      { title: 'Variações', text: 'Combina chapéus, moletons e fundos; descarta combinações que repetem demais.' },
      { title: 'Drop na Polygon', text: 'Escolhe a Polygon pela taxa baixa, o que permite edições abertas mais baratas.' },
    ],
  },
  {
    id: 'helena-vasconcelos',
    name: 'Helena Vasconcelos',
    handle: '@helena.v3d',
    role: 'Artista 3D',
    location: 'Porto Alegre, RS',
    memberSince: '2023-11-05T09:15:00.000Z',
    artwork: 'nft3',
    modelName: 'Alfaiataria (terno e gola alta)',
    royaltyPercent: '6',
    preferredNetwork: 'solana',
    tagline: 'Personagens esculpidos em 3D com luz de estúdio e acabamento de alfaiataria.',
    bio:
      'Formada em arquitetura, trabalhou com visualização 3D de interiores. Usa a mesma atenção a ' +
      'materiais e iluminação para vestir os personagens com tecidos que parecem reais.',
    tools: ['Blender', 'ZBrush', 'Substance Painter'],
    process: [
      { title: 'Escultura', text: 'Modela a cabeça e o corpo em alta resolução, depois reduz a malha para renderizar.' },
      { title: 'Materiais', text: 'Pinta tecidos (lã, tricô) e pele com mapas de textura próprios.' },
      { title: 'Render', text: 'Ilumina como em estúdio fotográfico e exporta em 2048 px para a arte desbloqueável.' },
      { title: 'Lançamento', text: 'Edições raras com preço riscado no lançamento e estoque pequeno por edição.' },
    ],
  },
  {
    id: 'caio-mendes',
    name: 'Caio Mendes',
    handle: '@caio.beats',
    role: 'Músico e motion designer',
    location: 'Belo Horizonte, MG',
    memberSince: '2025-01-19T18:45:00.000Z',
    artwork: 'nft4',
    modelName: 'Som (fones e tons dourados)',
    royaltyPercent: '4',
    preferredNetwork: 'polygon',
    tagline: 'Colecionáveis que nascem de faixas autorais e dão acesso a conteúdo sonoro.',
    bio:
      'Produz música eletrônica e faz vinhetas animadas para festivais. Cada personagem da série ' +
      'dourada corresponde a uma faixa, e quem coleciona recebe a versão estendida.',
    tools: ['After Effects', 'Ableton Live', 'Krita'],
    process: [
      { title: 'Faixa', text: 'Compõe a música primeiro; o clima da faixa define cores e expressão do personagem.' },
      { title: 'Arte', text: 'Ilustra o personagem com fones como marca da série, em tons de dourado.' },
      { title: 'Utilidade', text: 'Vincula ao NFT o acesso à versão estendida da faixa (utilidade do token).' },
      { title: 'Preço de entrada', text: 'Mantém preços baixos e edições abertas para formar comunidade.' },
    ],
  },
]

export const creatorForArtwork = (artwork: ArtworkKey): CreatorFixture =>
  CREATORS.find((c) => c.artwork === artwork)!
