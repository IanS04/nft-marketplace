# Arquitetura — Kurio

Documento técnico do marketplace: camadas, contratos, sessão, carrinho, cache, tempo real, mocks, acessibilidade, performance, limitações e desvios do Figma. Como rodar e reproduzir cenários: [`README.md`](./README.md).

## 1. Visão geral

```
Componentes (features/*/components)      ← não conhecem Axios, MSW nem chaves de cache
   │ hooks da feature (features/*/hooks, api)
   ▼
TanStack Query  ─────────────  TanStack Router (estado da URL, guards, loaders)
   │ endpoints (services/api/endpoints/*)  → valida toda resposta com Zod (schemas/*)
   ▼
Axios (services/api/http.ts) ── porta de rede (app/network-ready.ts) ── sessão (session-store)
   │                                                 socket.io-client (realtime/*)
   ▼                                                    ▼
════════════════════════ rede do navegador ════════════════════════
   ▼                                                    ▼
MSW: handlers REST (mocks/handlers)          MSW ws.link + @mswjs/socket.io-binding
   └──── regras de domínio (mocks/domain) ── banco simulado (mocks/db, localStorage) ── hub de eventos
```

Princípios:
- **Toda regra de negócio fictícia vive nos handlers do MSW** (`src/mocks`). Componentes, hooks e o cliente Axios não têm respostas fictícias nem caminhos alternativos: trocar o MSW por uma API real não muda o app.
- **Contratos tipados de ponta a ponta:** tipos de domínio em `src/types`, schemas Zod em `src/schemas` (`satisfies z.ZodType<T>`). Os mesmos schemas validam as respostas no cliente e as requisições nos handlers.
- **ETH é sempre string decimal** (`DecimalString`), calculado com `decimal.js` em `lib/money.ts`. Nenhum `Number`/`parseFloat` em valores. Quantidades são inteiras.
- **IDs com tipos "brand"** (`NftId`, `OrderId`…): um id de pedido não pode ser passado onde se espera um id de NFT.

## 2. Contratos REST

Prefixo `/api`. Respostas validadas com Zod. Rotas privadas exigem `Authorization: Bearer <token>`.

| Recurso | Método e rota | Auth | Corpo → resposta | Erros principais |
| --- | --- | :---: | --- | --- |
| Sessão | `POST /auth/register` | – | `{username, email, password}` → `AuthSession` (201) | 422, 409 `CONFLICT` (`fieldErrors.email/username`) |
| | `POST /auth/login` | – | `{email, password}` → `AuthSession` | 401 `INVALID_CREDENTIALS` |
| | `GET /auth/session` | ✔ | → `{user, expiresAt}` | 401 `UNAUTHENTICATED` / `SESSION_EXPIRED` |
| | `POST /auth/logout` | – | → 204 | – |
| NFTs | `GET /nfts` | – | `q, tab, categories, networks, minPrice, maxPrice, sort, page, pageSize` → `{items, pageInfo, facets, query}` | 422 (parâmetro inválido) |
| | `GET /nfts/featured` | – | → `{items}` | – |
| | `GET /nfts/:id` | – | → `Nft` (edições, galeria, atributos, `creator: {id, name}`) | 404 |
| Criadores | `GET /creators` | – | → `{items: CreatorSummary[]}` (estatísticas do catálogo atual) | – |
| | `GET /creators/:id` | – | → `Creator` (bio, processo, ferramentas, royalties, coleção) | 404 |
| Favoritos | `GET /favorites` | ✔ | → `{nftIds}` | 401 |
| | `GET /favorites/nfts` | ✔ | → `{items: NftSummary[]}` (lista de interesse) | 401 |
| | `PUT` / `DELETE /favorites/:nftId` | ✔ | idempotentes → `{nftIds}` | 404 |
| Carrinho | `GET /cart` | ✔ ou `X-Cart-Id` | → `Cart` | 400 (sem identificação) |
| | `POST /cart/items` | ✔ ou `X-Cart-Id` | `{nftId, editionId, quantity}` → `Cart` | 404, 409 `AVAILABILITY_CONFLICT` |
| | `PATCH /cart/items/:itemId` | ✔ ou `X-Cart-Id` | `{quantity}` → `Cart` | 404, 409 |
| | `DELETE /cart/items/:itemId` | ✔ ou `X-Cart-Id` | idempotente → `Cart` | – |
| | `PUT` / `DELETE /cart/coupon` | ✔ ou `X-Cart-Id` | `{code}` → `Cart` | 422 `COUPON_INVALID` / `COUPON_EXPIRED` |
| | `POST /cart/merge` | ✔ + `X-Cart-Id` | carrinho do visitante → carrinho da conta | 401 |
| Cotação | `POST /quote` | ✔ ou `X-Cart-Id` | `{network}` → `Quote` (linhas, subtotal, desconto, taxa, total, problemas) | 422 |
| Pedidos | `POST /orders` | ✔ + `Idempotency-Key` | `{quoteId, cartVersion, walletId, provider, network, collector}` → `Order` (201; **200** se a mesma chave já criou) | 400, 404, 409 `QUOTE_STALE` / `AVAILABILITY_CONFLICT` / `IDEMPOTENCY_CONFLICT` / `CONFLICT` (carteira desconectada) |
| | `GET /orders` / `GET /orders?status=pending` | ✔ | → `{items}` (do usuário, mais recentes primeiro) | 401 |
| | `GET /orders/:id` | ✔ | → `Order` (de outro usuário → 404) | 404 |
| Perfil | `GET` / `PATCH /profile` | ✔ | `{displayName, username, email, ensName, walletNickname?}` → `User` | 422, 409 (`fieldErrors`) |
| | `PUT` / `DELETE /profile/avatar` | ✔ | `{dataUrl}` (PNG/JPEG/WebP ≤ 400 KB) → `User` | 422 |
| | `POST /profile/password` | ✔ | `{currentPassword, newPassword}` → 204 | 422 (`fieldErrors.currentPassword`) |
| Carteiras | `GET` / `POST /wallets` | ✔ | `WalletInput` → `Wallet` (201) | 422, 409 (papel já cadastrado) |
| | `PUT /wallets/:id` | ✔ | `WalletInput` → `Wallet` | 403 `FORBIDDEN` (carteira de outro usuário), 404, 422 |
| | `POST` / `DELETE /wallets/:id/connection` | ✔ | `{provider, network}` → `WalletConnection` | 409 `WALLET_REJECTED` |
| Atividade | `GET /activity` | ✔ | → `{items: ActivityItem[]}` (pedidos, pagamentos, downloads e chamados) | 401 |
| Ofertas | `GET /offers` | ✔ | → `{items: Offer[]}` (cupons publicados, ativos e expirados) | 401 |
| Arquivos | `GET /downloads` | ✔ | → `{items: DownloadItem[]}` (edições de pedidos confirmados) | 401 |
| | `POST /downloads/:id` | ✔ | registra o download → `{item, url, fileName}` | 403 `FORBIDDEN` (arquivo de outro usuário), 404 |
| Suporte | `GET` / `POST /support/tickets` | ✔ | `{category, subject, orderId?, message}` → `SupportTicket` (201, com protocolo) | 422 (`fieldErrors`, inclusive pedido que não é do usuário) |

**Formato de erro** (`ApiErrorBody`): `{ code, message, status, retryable, fieldErrors?, details? }`. Códigos: `VALIDATION_ERROR` 422 · `INVALID_CREDENTIALS` 401 · `UNAUTHENTICATED` 401 · `SESSION_EXPIRED` 401 · `FORBIDDEN` 403 · `NOT_FOUND` 404 · `CONFLICT` 409 · `AVAILABILITY_CONFLICT` 409 · `IDEMPOTENCY_CONFLICT` 409 · `COUPON_INVALID`/`COUPON_EXPIRED` 422 · `QUOTE_STALE` 409 · `WALLET_REJECTED` 409 · `TRANSIENT` 5xx (retryable) · `NETWORK_ERROR` (sem resposta). O interceptor do Axios converte qualquer falha em `ApiError`. Os `fieldErrors` são levados aos campos do formulário (`lib/form-errors.ts`).

**403 × 404:** recurso que não existe responde 404; recurso que existe mas é de outro colecionador responde 403 (carteiras e arquivos). A exceção é `GET /orders/:id`, que responde 404 para pedido alheio, para não revelar nem que o pedido existe.

## 3. Eventos Socket.IO

| Evento | Destino | Payload |
| --- | --- | --- |
| `nft.updated` | Todas as conexões (público) | `{nftId, price, compareAtPrice, editions: [{id, price, available, status}]}` |
| `order.updated` | Só as conexões do **dono** do pedido | `{orderId, status, transactionId, rejection}` |

**Envelope** comum: `{ eventId, type, resource: {type, id}, version, occurredAt, userId?, payload }`. A `version` é a do recurso (`nft.version`, `order.version`), monotônica, e o cliente valida o envelope com Zod.

**Quem emite:** o hub simulado (`mocks/realtime/hub.ts`). Toda mudança de dados publica o evento correspondente: preço ou estoque alterado, reserva de estoque ao criar um pedido, devolução na recusa, liquidação do pedido. Assim, a mesma mudança aparece na REST e no socket.

**Transporte e limitações:** o `socket.io-client` real conecta por WebSocket (`transports: ['websocket']`). O MSW intercepta o WebSocket no navegador (`ws.link`) e o `@mswjs/socket.io-binding` codifica e decodifica o protocolo Socket.IO. Limitações do ambiente de mocks:
- sem long-polling (o MSW só intercepta WebSocket);
- sem rooms, broadcast nativo nem ack (o binding não implementa); o roteamento por usuário é feito pelo hub;
- o binding faz o handshake, mas não o heartbeat: o mock envia o ping a cada 20 s, senão o cliente derrubaria a conexão a cada ~30 s;
- o MSW remove `/socket.io/` do caminho antes de casar, por isso o link é a origem; conexões sem `EIO` (ex.: HMR do Vite) seguem para o servidor real;
- o `socket.io-client` é carregado por import dinâmico **depois** dos mocks: o engine.io guarda a referência a `WebSocket` quando o módulo é avaliado.

**Autenticação do socket:** o token vai no `auth` do pacote CONNECT do Socket.IO. O servidor simulado associa a conexão ao usuário e só entrega `order.updated` ao dono.

## 4. Sessão

- `session-store` é um store externo (`useSyncExternalStore`) persistido em `localStorage` (`kurio:session`), com os estados `anonymous | authenticated | expired`. Senhas nunca são guardadas no cliente.
- **Recuperação após refresh:** a sessão é restaurada do `localStorage` e confirmada no servidor (`GET /auth/session`), de novo a cada volta de foco.
- **Expiração** (TTL simulado de 30 min, ou `session-expired`): um 401 `SESSION_EXPIRED`/`UNAUTHENTICATED` marca a sessão como expirada, mas **só se o token enviado ainda for o atual**, para que um 401 tardio não derrube uma sessão nova. Há um timer local para o vencimento.
  - **Durante a navegação:** o guard `_auth` (`beforeLoad`) revalida a sessão e redireciona para `/login?redirect=<página>`, com o e-mail preenchido. O redirect só aceita caminhos internos (sem open redirect).
  - **Parado na tela** (ex.: preenchendo o checkout): o diálogo "Sua sessão expirou" reautentica **sem navegar**, preservando o que foi digitado. Com o mesmo usuário, o cache é mantido e o que falhou é refeito.
- **Logout e troca de usuário:** `session-sync` cancela e **remove todo o cache privado** (`['user', …]`), limpa o cache de mutations e encerra o socket da sessão anterior (um socket por sessão). A chave de idempotência **não** é apagada no logout, para não duplicar um pedido pendente.
- Sincronização entre abas pelo evento `storage`.

## 5. Estado do carrinho

- O carrinho **vive no servidor simulado**, também para o visitante, identificado pelo header `X-Cart-Id` (UUID em `kurio:guest-cart-id`). Assim, persiste após o refresh e reflete preços atuais.
- **Login:** os itens do visitante são juntados ao carrinho da conta (`POST /cart/merge`), respeitando a disponibilidade de cada edição. O merge depende do **estado** (sessão autenticada + carrinho de visitante pendente), não da transição: se a página recarregar no meio, ele é retomado.
- Toda mutation devolve o `Cart` atualizado, que vai direto para o cache. A `version` do carrinho muda a cada alteração e faz parte da chave da cotação.
- **Valores só da API:** o resumo (subtotal, desconto, taxa, total) vem de `POST /quote`. O cliente não soma nada. A cotação marca problemas bloqueantes (edição esgotada, estoque insuficiente, cupom inválido ou expirado).
- **Limites:** `quantidade ≤ min(maxPerOrder, disponível)`. No detalhe, o limite desconta o que já está no carrinho.
- **Cupom:** guardado no próprio carrinho (`couponCode`), sobrevive ao refresh.
- **Após a compra:** saem do carrinho **apenas** os itens e quantidades do snapshot do pedido confirmado (e o cupom usado). Em recusa ou falha, nada é removido.

## 6. Pedidos e idempotência

- `lib/idempotency.ts` gera a chave a partir do **conteúdo** da tentativa (JSON com chaves ordenadas), guardada por usuário (`kurio:idempotency:order:<userId>`). Mesmo conteúdo dá a mesma chave, inclusive após timeout ou refresh; conteúdo diferente dá chave nova. A chave só é limpa em **estado terminal**.
- **Servidor:** mesma chave e mesmo corpo devolvem o mesmo pedido (200); mesma chave com corpo diferente dá 409 `IDEMPOTENCY_CONFLICT`.
- **Revalidação antes de confirmar:** o diálogo de revisão relê carrinho e cotação do servidor e compara com o total visto. O servidor também revalida (cotação existente e válida, versão do carrinho, disponibilidade, total). Qualquer mudança gera `QUOTE_STALE`/`AVAILABILITY_CONFLICT`, e a UI mostra os novos valores e exige **nova confirmação**.
- **Timeout:** após `NETWORK_ERROR`, o cliente reenvia automaticamente (até 3 tentativas, intervalo de 1,5 s) com a **mesma chave**, e recupera o pedido criado. Clique repetido também não duplica (botão bloqueado + mesma chave).
- **Estados:** `pending → confirmed | rejected` (terminais). O estoque é reservado na criação e devolvido na recusa. A liquidação simulada ocorre ~2 s após a criação e é publicada como `order.updated`.
- **Pedido pendente:** o checkout consulta `GET /orders?status=pending` e bloqueia uma nova compra enquanto houver um.
- **Recibo:** só é exibido para pedido `confirmed` vindo da simulação, e é um **snapshot** (itens, preços, taxas, total) gravado na criação: mudanças posteriores no catálogo não o alteram.

## 6.1 Seções da conta ("Meu perfil")

A sidebar do Figma tem, além de Dados do perfil e Carteiras, cinco itens. Todos funcionam de ponta a ponta (REST + MSW + cache), como rotas privadas filhas de `/profile`:

| Item | Rota | Como funciona |
| --- | --- | --- |
| Atividade | `/profile/activity` | Histórico **derivado no servidor** do que aconteceu no banco simulado: pedido enviado, pagamento confirmado ou recusado, arquivo baixado, chamado aberto. Cada linha leva ao pedido, quando houver. |
| Lista de interesse | `/profile/favorites` | Os NFTs favoritados (`GET /favorites/nfts`). Desfavoritar pelo coração do card some da lista na hora (a tela filtra pelos ids da atualização otimista) e volta se a API recusar (rollback). Preços atualizam por `nft.updated`. |
| Ofertas | `/profile/offers` | Os cupons publicados (os mesmos de `mocks/fixtures/coupons.ts`), com situação e validade. "Aplicar no carrinho" usa o mesmo `PUT /cart/coupon` do carrinho: o desconto real vem da cotação. Cupom expirado aparece, mas não pode ser aplicado. |
| Arquivos baixados | `/profile/downloads` | Arte de cada edição de **pedido confirmado**. "Baixar" registra o download na API (`POST /downloads/:id`) e só então entrega o arquivo (WebP de 800 px); o contador e a data do último download vêm da resposta. |
| Suporte | `/profile/support` | Formulário validado (assunto, pedido relacionado opcional, título, mensagem) que abre um chamado persistido, com protocolo `KUR-00xxxx`, e a lista dos chamados do usuário. |

No banco simulado (`SCHEMA_VERSION = 6`) entraram `downloads` (histórico) e `tickets`. A tab bar mobile leva o coração à lista de interesse, e o rodapé liga "Atividade", "Lista de interesse" e "Central de ajuda" às rotas acima.

## 6.2 Criadores e Aprenda

- **Criadores** (`/creators`, `/creators/$creatorId`): quatro artistas **fictícios**, um por arte do Figma (cada um "assina" um modelo). Dados em `mocks/fixtures/creators.ts`: nome, cidade, função, bio, ferramentas, processo de criação em 4 etapas, rede preferida e royalties, genéricos mas distintos entre si. Cada NFT aponta para o criador da sua arte (`nft.creator`), e o royalty do NFT é o do criador. As estatísticas (quantidade de NFTs, menor preço, edições limitadas à venda) são calculadas do **catálogo atual**, então mudam com preço e estoque. O perfil tem loader + `notFound()` (acesso direto e criador inexistente), skeleton e a coleção com o mesmo card do mercado (favoritar funciona). Avatares são iniciais, sem fotos de pessoas reais.
- **Aprenda** (`/learn`): conteúdo educativo **estático** (`features/learn/content.ts`), como o hero e o diário: o que é um NFT, redes e taxas, edições, royalties, carteira e segurança, como comprar no Kurio (passos com links para as telas), glossário e perguntas frequentes (`<details>`). Os exemplos citam o que existe no app (taxas por rede, edições 1/1 a ABERTA, carteira principal/secundária). Sumário com âncoras (`scroll-mt` para o header fixo).
- **Navegação:** no desktop, pelos itens "Criadores" e "Aprenda" do header (com estado ativo). No mobile, que não tem header no Figma, pelo rodapé: título "Criadores em destaque", "Segurança da carteira", "Como comprar NFTs" e "Carteira e segurança". O detalhe do NFT ganhou a linha "Criador" com link para o perfil.

## 7. Estratégia de cache (TanStack Query)

| Política | Valor |
| --- | --- |
| `staleTime` / `gcTime` | 30 s / 5 min (padrão) |
| Retry | até 2, **só** para `ApiError.retryable` (rede/5xx); backoff exponencial com jitter, teto de 4 s |
| Mutations | sem retry automático (o reenvio de pedido é explícito e idempotente) |
| Refetch | ao focar a janela e ao reconectar |
| Timeout HTTP | 8 s (o tempo de espera da porta de rede não conta) |

- **Chaves** (`app/query-keys.ts`): catálogo `['nfts', 'list', query]`, com arrays ordenados e deduplicados para a mesma seleção dar a mesma chave; detalhe `['nfts', 'detail', id]`; **tudo que é privado fica sob `['user', userId, …]`** (sessão, favoritos e lista de interesse, carrinho, carteiras, perfil, pedidos, atividade, arquivos, chamados), então limpar esse prefixo isola usuários. A lista de interesse fica sob a chave dos favoritos (`['user', id, 'favorites', 'nfts']`): invalidar os favoritos também a relê. Ofertas e criadores são públicos: `['offers']`, `['creators', 'list' | 'detail', id]`. Atividade e arquivos usam `staleTime: 0`, porque mudam por fora da tela (liquidação de pedido, download em outra aba). Carrinho do visitante: `['cart', 'guest', id]`. A cotação fica "dentro" do carrinho: `[...cartKey, 'quote', version, network]`.
- **Respostas obsoletas:** cada combinação de filtros tem a sua chave, e o `signal` do Query é repassado ao Axios, então requisições obsoletas são canceladas. `keepPreviousData` mantém a grade anterior esmaecida enquanto a nova carrega.
- **Atualização otimista com rollback:** favoritos (`onMutate` aplica, `onError` restaura e avisa, `onSettled` sincroniza).
- **Invalidação:** mutations de carrinho gravam o `Cart` devolvido; conflito 409 relê o carrinho; perfil atualiza cache e sessão; pedido terminal invalida carrinho e pendentes; download e chamado novo gravam a resposta no cache e invalidam a atividade; eventos em tempo real atualizam ou invalidam (seção 8).

## 8. Reconciliação REST ↔ Socket.IO

- **`EventGuard`** (`realtime/apply-event.ts`): descarta eventos já vistos (`eventId`, até 500 lembrados) e eventos com `version ≤` última versão aplicada do mesmo recurso. Além disso, o cache só é alterado se a versão do evento for **maior que a do dado em cache**. Duplicados e atrasados nunca regridem o estado nem repetem efeitos (toasts).
- **`nft.updated`:** atualiza detalhe, listas, destaques e lista de interesse no cache (sem refetch) e **invalida os carrinhos** que contêm o NFT. O carrinho e a cotação são relidos da API, que é a fonte da verdade dos valores. Se o NFT está no carrinho, aparece um toast "Preço atualizado: X, de A para B ETH" ou "esgotou".
- **`order.updated`:** só é aceito se `userId` for o da sessão atual (defesa em profundidade, além do filtro no servidor). Invalida o pedido, os pendentes, o carrinho, a atividade e os arquivos (pedido confirmado libera o download), e notifica confirmação ou recusa.
- **Reconexão:** ao reconectar, `reconcileActiveQueries` relê da REST tudo o que está em tela (catálogo, carrinhos, pedidos, favoritos, atividade, arquivos), recuperando os eventos perdidos durante a queda. Enquanto o socket está fora, aparece o aviso "Conexão em tempo real perdida", e a página do pedido consulta a API a cada 5 s como rede de segurança.
- **Ciclo de vida:** um socket por sessão; ao trocar de sessão, `removeAllListeners` + `disconnect`. Eventos de uma sessão anterior não chegam à nova.

## 9. Mocks (MSW)

- **Banco simulado** (`mocks/db`) persistido em `localStorage` (`kurio:mock-db:v1`, com `SCHEMA_VERSION`: mudou o formato, ressemeia). `__kurioMocks.reset()` restaura integralmente o estado conhecido (usuários, 36 NFTs determinísticos, favoritos, carteiras; carrinhos, pedidos, downloads e chamados vazios).
- **Fixtures determinísticas:** PRNG com semente. Os 9 primeiros NFTs reproduzem o Figma; o carrinho do Figma (2×1.19 + 6×1.39 + 9×1.79 + 0.016) dá exatamente 26.846 ETH.
- **Condições de rede:** todo handler passa por `withConditions` (latência fixa, variável ou fora de ordem, e falhas por regra: erro HTTP, falha de conexão, timeout). Cenários configuráveis e reproduzíveis, listados no README. `request-timeout` usa a falha `timeout` (o handler nunca responde e o cliente estoura os 8 s); `flaky-favorites` só afeta as mutations (`PUT`/`DELETE`), não a leitura da lista de interesse.
- **Ativação:** `VITE_ENABLE_MOCKS` (padrão `true`, inclusive no build publicado). Os chunks do MSW são pré-carregados em paralelo ao app (plugin `kurio:preload-mocks` no `vite.config.ts`).
- **Porta de rede:** o app renderiza imediatamente; as requisições Axios e o socket aguardam o `worker.start()` (`app/network-ready.ts`). Nenhuma requisição sai antes de o mock interceptar.
- **Controles** (`window.__kurioMocks`): `scenarios`, `scenario()`, `setScenario()`, `reset()`, `expireSession()`, `setSettleDelay()`, `realtime.{changePrice, changeStock, replayLast, emitStale, emitForeignOrder, setOnline, peerCount}`.

## 10. Acessibilidade

Auditoria axe-core (WCAG 2.2 A/AA) em todas as telas, modais e drawers, nos 3 viewports: **zero violações**. Lighthouse: Acessibilidade 100. Ajustes em relação ao layout:
- Campos que o Figma mostra só com placeholder (login, cadastro, cupom mobile) têm `<label>` visível apenas para leitores de tela.
- Erros associados aos campos (`aria-invalid` + `aria-describedby`), com o foco indo ao primeiro campo inválido. As mensagens têm ícone, além da cor.
- Estados que não dependem só de cor: ✓ nos filtros ativos, edição esgotada riscada e anunciada "(esgotada)", `aria-pressed` em favoritos.
- Links no meio de frases sempre sublinhados (contraste com o texto ao redor < 3:1).
- Foco visível em tudo; link "Pular para o conteúdo"; diálogos e drawers prendem o foco e o devolvem a quem abriu; o menu do usuário segue o padrão WAI-ARIA.
- Live regions para resultados de busca, mutations e eventos em tempo real; toasts acessíveis.
- `prefers-reduced-motion` desliga o shimmer e as animações; sem overflow horizontal até 320 px (zoom de 400%).
- Ações fora do escopo usam `<Unavailable>`: mantêm o visual, não são clicáveis e anunciam "(indisponível nesta demonstração)".
- Seções da conta: listas com rótulo, tipo de atividade em texto (não só ícone ou cor), situação do cupom escrita ("Válido até"/"Expirou em"), botões com o texto visível dentro do nome acessível e o complemento só para leitores de tela ("Aplicar no carrinho cupom KURIO10", WCAG 2.5.3). Downloads e chamados são anunciados na live region.

## 11. Performance e Lighthouse

`pnpm audit:lighthouse`: build de produção (`vite preview`) com o cenário `default` dos mocks; início e detalhe; mobile (preset padrão: 4G lento, RTT 150 ms, 1,6 Mbps, CPU 4×, 412×823) e desktop (preset oficial: RTT 40 ms, 10 Mbps, 1350×940); **3 medições** por página e perfil num Chrome limpo; mediana. Lighthouse 13.5, Chrome 156 headless, Node 24, Windows 11, Ryzen 5 5500. Relatórios HTML/JSON e resumo em `lighthouse/reports/latest/`.

| Página | Perfil | Performance | A11y | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | desktop | **99** | 100 | 100 | 100 | 0,89 s | 0 | 0 ms |
| Detalhe | desktop | **99** | 100 | 100 | 100 | 0,88 s | 0 | 0 ms |
| Início | mobile | **77** | 100 | 100 | 100 | 4,48 s | 0 | 123 ms |
| Detalhe | mobile | **75** | 100 | 100 | 100 | 3,98 s | 0,029 | 299 ms |

**O que foi otimizado** (a medição inicial era mobile 79/77, Boas práticas 96, SEO 92, CLS do detalhe 0,099):
- render imediato com porta de rede (a UI não espera o MSW);
- formulários de auth, menu do usuário e biblioteca de toasts carregados sob demanda; select de ordenação nativo (saíram Radix Select e floating-ui do carregamento inicial);
- fonte self-hosted (só o subset latin) com preload; arte do hero com preload; o hero renderiza só a variante do viewport (imagens escondidas com CSS também seriam baixadas);
- chunks do MSW pré-carregados em paralelo ao app;
- `<main>` com altura mínima (o rodapé não "sobe e desce" enquanto a rota carrega: CLS 0,099 → 0);
- favicon (o 404 no console derrubava Boas práticas) e `robots.txt` (SEO).

**Por que a performance mobile fica abaixo de 90:** no mobile, o maior elemento é a imagem do 1º card do catálogo (início) e a imagem do NFT (detalhe), ambas **dependentes de dados**. O caminho até elas é uma cadeia que, no 4G lento com CPU 4×, leva ~4 s:
1. JavaScript do app (~200 KB comprimidos: React, TanStack Router e Query, Axios e Zod, a stack exigida) → FCP ~3,1 s;
2. o "backend" desta demo **roda no navegador**: MSW (~100 KB comprimidos) + registro do service worker. O enunciado exige auditar com os mocks e sem simplificações;
3. a chamada à API e o download da imagem.

O CLS está dentro do recomendado (≤ 0,1). O TBT fica em 123 ms no início e 299 ms no detalhe, acima do ideal de 200 ms: é o custo de executar o MSW e montar a tela na CPU 4× mais lenta. O desktop está em 99. Chegar a 90 no mobile exigiria renderizar no servidor (SSR/pré-renderização) com uma API real fora do navegador, o que está fora do escopo desta entrega.

## 12. Limitações

- **Senhas no mock:** SHA-256 com salt. Não é um KDF real (sem custo ou work factor); suficiente para não guardar senha em claro numa simulação.
- **Persistência local:** o banco simulado vive no `localStorage` de cada navegador. Dados não são compartilhados entre dispositivos, e limpar o armazenamento equivale a um reset.
- **Tempo real:** só WebSocket, sem rooms nem ack, heartbeat feito pelo mock (seção 3). Fora do navegador (ex.: testes de API em Node) o binding não é usado.
- **Explorador de blocos e transações:** hashes e links simulados. "Ver no Etherscan" abre um "Explorador simulado", em vez de levar a um link que daria "não encontrado".
- **Baselines visuais** geradas no Windows. Em outro sistema, gere as próprias (fontes renderizam diferente).
- **Suporte:** o chamado é registrado e listado, mas não há atendente simulado: ele fica "Aberto" (a tela não promete resposta).
- **Arquivos:** o download baixa o arquivo como blob e salva com o nome da API (a Vercel envia `Content-Disposition` com o nome original do arquivo estático, que o navegador priorizaria sobre o atributo `download`). Entrega o WebP de 800 px, o maior derivado das artes do Figma (os originais de ~2,7 MB não vão para o build).
- **Service worker:** na primeira visita, as requisições aguardam o registro do MSW (alguns centésimos de segundo).

## 13. Decisões de UX

- **Login e cadastro:** modal sobre a página atual no desktop (Figma) e página cheia no mobile. Fechar ou entrar mantém o usuário onde estava; rotas privadas usam `?redirect=`.
- **"Confirmar compra"** abre a **revisão** (valores conferidos agora com o servidor) e o pagamento é confirmado nela ("Confirmar pagamento"). Assim a revalidação e a nova confirmação ficam explícitas.
- **Conexão da carteira** simulada (conectar, recusar, desconectar) antes de confirmar; trocar carteira, tipo ou rede exige reconectar.
- **Busca:** a do header inicia uma busca nova (limpa filtros); a do mobile refina os filtros atuais (debounce de 400 ms). Filtros, ordenação, aba e página ficam na URL; mudar um filtro volta para a página 1; uma página além do fim é corrigida para a última (`replace`).
- **Telas focadas no mobile** (detalhe, carrinho, pagamento, login e cadastro): sem tab bar e rodapé, com barra de ação própria, como no Figma.
- **Mobile:** os dados do colecionador no pagamento vêm recolhidos (pré-preenchidos do perfil e da carteira) e se abrem sozinhos se houver erro.
- **Edição padrão** no detalhe: 1/50, se disponível (como no Figma). A quantidade é limitada pelo estoque menos o que já está no carrinho, com aviso.
- **Sessão expirada no checkout:** o formulário continua montado (um erro em segundo plano não substitui a tela quando há dados em cache). Depois do novo login, a revisão que falhou com 401 é refeita sozinha, com valores do servidor.
- **Ofertas:** aplicar um cupom com o carrinho vazio é permitido (ele fica salvo no carrinho), e a oferta avisa que o desconto vale para os próximos itens.
- **Feedback:** toasts com live region; erros sempre com "Tentar novamente"; skeletons com as mesmas dimensões do conteúdo.

## 14. Desvios do Figma e substituição de assets

- **Artes:** o Figma exportou 4 ilustrações (SVG com PNG de 1254 px embutido, ~2,7 MB cada). Os originais ficam em `assets-src/nfts/`, e `pnpm assets` gera WebP de 400 e 800 px (11–47 KB). Como há mais nomes de NFT que artes, vários NFTs compartilham uma ilustração (ex.: Golden Beat/Frequency/Signal usam a do macaco dourado). O mapeamento está em `mocks/fixtures/nfts.ts`.
- **Fonte:** JetBrains Mono (monoespaçada como no Figma), self-hosted (OFL).
- **Cores:** os tokens foram estimados dos prints. Destrutivo, sucesso e alerta não existem no Figma e foram criados no mesmo tom (todos aprovados no contraste).
- **Formulários de pagamento e carteiras:** o Figma repete campos de perfil e de carteira ("Código de indicação*", "Nome ENS*"). O visual foi mantido; no pagamento, endereço, ENS e tipo vêm da carteira cadastrada escolhida (somente leitura), e "Usar outra carteira?" troca para a secundária.
- **"Apelido da carteira"** no perfil: aplicado à carteira principal.
- **Pills de edição:** o Figma mostra "1/10" duplicado; as edições foram modeladas como 1/1, 1/10, 1/50 e ABERTA.
- **Detalhe:** os rótulos "Contrato" e "Direitos autorais" estão trocados no Figma; foram corrigidos (contrato → endereço ERC-721; direitos → royalties).
- **Compartilhar:** o Figma mostra Instagram, que não tem link de compartilhamento na web; foi substituído por "Copiar link".
- **"Avaliações de colecionadores":** fora do escopo; exibe só a nota e a contagem, com a aba indisponível.
- **Perfil, carteiras e confirmação no mobile:** sem frame no Figma; foram derivados do padrão das outras telas mobile.
- **Navegação:** "Mercado" leva ao catálogo e fica ativo no fluxo de compra; "Criadores" e "Aprenda" levam às páginas da seção 6.2 (sem frame no Figma; seguem o padrão visual das outras telas). Na tab bar mobile, o botão central (ícone de leitor) abre a busca e o coração leva à lista de interesse.
- **Seções da conta (atividade, lista de interesse, ofertas, arquivos, suporte):** o enunciado deixa atividade, ofertas, downloads e suporte fora da entrega obrigatória, mas foram implementadas de ponta a ponta para que nenhum item da sidebar fique sem função. Sem frame no Figma, seguem o padrão da tela de perfil (título, cards `bg-card`, mesmos campos de formulário).
- **Criadores e Aprenda:** o enunciado trata páginas editoriais como fora da entrega; foram feitas a pedido, com criadores fictícios ligados às 4 artes e conteúdo educativo estático.
- **Fora do escopo, sem aparentar sucesso:** login social, "Esqueceu a senha?", newsletter, "Ler mais" do diário, "Minha coleção", "Estúdio do criador" e os links editoriais da Central de ajuda ("Como comprar NFTs" etc.).
- **Carrinho:** o Figma mostra 3 itens no desktop e 4 no mobile (ilustrativo); a quantidade vem dos dados.
- **Select de ordenação:** nativo do sistema (acessível e leve), com o mesmo visual fechado ("Ordenar por: Listados recentemente ▾").
