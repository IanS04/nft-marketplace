/**
 * Conteúdo educativo da página "Aprenda" (estático, como o hero e o diário).
 * Os exemplos citam o que existe neste mercado (edições, redes, taxas, carteiras), para o texto
 * ajudar a usar o app e não ficar só na teoria.
 */

export interface LearnSection {
  id: string
  title: string
  paragraphs: string[]
  bullets?: { term: string; text: string }[]
}

export const LEARN_SECTIONS: LearnSection[] = [
  {
    id: 'como-funciona',
    title: 'O que é um NFT e como funciona',
    paragraphs: [
      'NFT (token não fungível) é um registro único numa blockchain que diz quem é o dono de um item digital. "Não fungível" significa que um token não é igual a outro: ao contrário de uma moeda, cada um tem identidade própria.',
      'O registro é criado por um contrato inteligente, um programa publicado na blockchain que controla a criação (cunhagem) e a transferência dos tokens. Cada token aponta para metadados: nome, atributos e o endereço do arquivo da arte.',
      'Comprar um NFT transfere a propriedade do token para a sua carteira. Isso não transfere os direitos autorais da obra: o criador continua autor, e o que você pode fazer com a imagem depende da licença de cada coleção.',
    ],
  },
  {
    id: 'redes',
    title: 'Blockchains e taxas de rede',
    paragraphs: [
      'Toda transferência é gravada por uma rede de computadores que cobra uma taxa para processá-la (o "gas"). O valor varia com a rede e com o movimento do momento.',
      'Aqui no Kurio, cada NFT é cunhado em uma rede, e a taxa aparece separada no resumo do carrinho e do pagamento:',
    ],
    bullets: [
      { term: 'Ethereum', text: 'a rede mais usada para arte digital; taxa maior (0.016 ETH nesta demonstração).' },
      { term: 'Polygon', text: 'compatível com a Ethereum e bem mais barata (0.002 ETH aqui), boa para edições abertas.' },
      { term: 'Solana', text: 'rápida e de taxa baixa (0.001 ETH aqui), com um ecossistema próprio de carteiras.' },
    ],
  },
  {
    id: 'edicoes',
    title: 'Edições e raridade',
    paragraphs: [
      'Um mesmo NFT pode ser vendido em edições com tiragens diferentes. Quanto menor a tiragem, mais rara (e normalmente mais cara) é a edição. O estoque de cada edição aparece no detalhe e muda em tempo real quando alguém compra.',
    ],
    bullets: [
      { term: '1/1', text: 'exemplar único: só uma pessoa pode tê-lo.' },
      { term: '1/10 e 1/50', text: 'tiragens limitadas, numeradas, com estoque que acaba.' },
      { term: 'Aberta', text: 'sem limite de exemplares durante o período de venda.' },
    ],
  },
  {
    id: 'royalties',
    title: 'Royalties: como o criador ganha',
    paragraphs: [
      'Além da venda inicial, muitos criadores definem um royalty: uma porcentagem que recebem automaticamente sempre que o NFT é revendido em mercados compatíveis. Os criadores do Kurio cobram entre 4% e 7,5%, e o valor aparece no perfil de cada um e no detalhe do NFT.',
    ],
  },
  {
    id: 'seguranca',
    title: 'Carteira e segurança',
    paragraphs: [
      'A carteira guarda as chaves que provam que você é dono dos seus tokens. Quem tem a chave privada (ou a frase de recuperação) controla a carteira, então ela nunca deve ser compartilhada, nem com o suporte.',
      'Para comprar, o mercado pede que você conecte a carteira e confirme a transação nela. No Kurio você cadastra uma carteira principal e uma secundária e escolhe qual usar no pagamento.',
    ],
    bullets: [
      { term: 'Nunca digite a frase de recuperação', text: 'em sites, formulários ou mensagens. Nenhum serviço legítimo pede isso.' },
      { term: 'Confira o que está assinando', text: 'a carteira mostra o valor e o destino antes de você aprovar.' },
      { term: 'Desconfie de pressa', text: 'ofertas "só hoje" e links recebidos por mensagem são o golpe mais comum.' },
    ],
  },
]

export const BUY_STEPS: { title: string; text: string; link?: { label: string; to: '/' | '/cart' | '/profile/wallets'; hash?: string } }[] = [
  { title: 'Escolha um NFT', text: 'Use a busca e os filtros do catálogo; o detalhe mostra edições, estoque e criador.', link: { label: 'Abrir o catálogo', to: '/', hash: 'catalogo' } },
  { title: 'Defina edição e quantidade', text: 'O limite respeita o estoque de cada edição e o que já está no seu carrinho.' },
  { title: 'Revise o carrinho', text: 'Aplique um cupom, se tiver. Subtotal, desconto, taxa de rede e total vêm da cotação do servidor.', link: { label: 'Ver carrinho', to: '/cart' } },
  { title: 'Cadastre uma carteira', text: 'Na primeira compra, cadastre a carteira principal (e, se quiser, uma secundária).', link: { label: 'Minhas carteiras', to: '/profile/wallets' } },
  { title: 'Conecte e confirme', text: 'Escolha a rede, conecte a carteira e revise o pedido. Se o preço mudou, você confirma de novo.' },
  { title: 'Acompanhe o recibo', text: 'O pedido fica pendente até a rede confirmar; depois aparecem o hash da transação e a arte para baixar.' },
]

export const GLOSSARY: { term: string; text: string }[] = [
  { term: 'Blockchain', text: 'Registro público e distribuído onde as transações ficam gravadas.' },
  { term: 'Cunhagem (mint)', text: 'Criação do token na blockchain, feita pelo criador.' },
  { term: 'Contrato inteligente', text: 'Programa na blockchain que cria e transfere os tokens de uma coleção.' },
  { term: 'Metadados', text: 'Nome, atributos e endereço do arquivo associados a um token.' },
  { term: 'Gas', text: 'Taxa paga à rede para processar uma transação.' },
  { term: 'ENS', text: 'Nome legível (ex.: ana.kurio.eth) que aponta para um endereço de carteira.' },
  { term: 'Hash da transação', text: 'Identificador único de uma transação, usado para consultá-la num explorador.' },
  { term: 'Floor price', text: 'Menor preço pedido entre os NFTs de uma coleção ou criador.' },
]

export const FAQ: { question: string; answer: string }[] = [
  {
    question: 'Posso usar a imagem do NFT que comprei?',
    answer: 'Você pode exibi-la e baixar a arte em "Arquivos baixados". Uso comercial depende da licença do criador; a propriedade do token não inclui os direitos autorais.',
  },
  {
    question: 'Por que o total mudou na hora de pagar?',
    answer: 'Preço e estoque podem mudar enquanto você navega. Antes de confirmar, o Kurio confere tudo com o servidor e pede uma nova confirmação se algo mudou.',
  },
  {
    question: 'O que acontece se a conexão cair durante o pagamento?',
    answer: 'O pedido não é duplicado: ao reenviar, o servidor reconhece a mesma tentativa e devolve o mesmo pedido. Ao voltar, você vê se ele foi confirmado ou recusado.',
  },
  {
    question: 'Esta compra é real?',
    answer: 'Não. Este mercado é uma demonstração: carteiras, pagamentos e blockchain são simulados, e nenhum valor é cobrado.',
  },
]
