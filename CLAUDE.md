# CLAUDE.md — Kurio · NFT Marketplace (desafio frontend)

> Contexto de handoff do chat para o Claude Code. Leia inteiro antes de qualquer ação.
> Fontes de verdade, em ordem: (1) `docs/DESAFIO.md` (enunciado original), (2) prints do Figma em `docs/figma/`, (3) este arquivo, (4) o código.
> Se algo aqui conflitar com o enunciado, o enunciado vence. Se `docs/DESAFIO.md` ou `docs/figma/` não existirem no repositório, peça ao Ian para adicioná-los.

## 1. Papel e modo de trabalho

- Atue como **pair programmer e arquiteto frontend lead** do Ian (dev frontend júnior, Brasília). Responda sempre em **português**.
- Objetivo: entregar o desafio com **100% de conformidade** com os critérios de avaliação e **fidelidade visual** ao Figma.
- Trabalhe em **etapas modulares**, nunca o projeto inteiro de uma vez. Cada etapa: código completo e tipado, com caminho (`/src/...`), testes Playwright da etapa e checklist de aceitação.
- Use a task list para etapas com várias tarefas; o último item é sempre **verificar** (typecheck, lint, teste rodando, tela conferida).
- Explique decisões não óbvias em 1–2 frases. O Ian está aprendendo: prefira clareza a esperteza.
- O código das Etapas 1 e 2 foi escrito no chat **sem ser executado nem compilado**. Primeira ação: validar (seção 9).

## 2. O desafio em resumo

Marketplace de NFTs (marca **Kurio**) em React + TypeScript, desktop e mobile, com **APIs, auth, carteiras e pagamentos simulados via MSW**. Sem blockchain real.

**Telas:** Início (destaques, catálogo, busca, filtros, ordenação, paginação) · Detalhes do NFT · Carrinho · Pagamento · Confirmação de pedido · Login · Cadastro · Perfil do colecionador · Carteiras. Perfil, carteiras e confirmação também devem funcionar no mobile, mesmo sem frame. Fora do escopo: páginas editoriais, suporte, atividade, ofertas, downloads (ações fora do escopo **não podem aparentar sucesso**).

**Pontuação:** fidelidade visual/responsividade 20 · fluxos e UX 20 · integração e estado 15 · tempo real 10 · mocking 10 · testes 10 · acessibilidade 5 · performance 5 · arquitetura/documentação 5.

**Eliminatórios:** não usar de fato a stack obrigatória · fluxos só visuais · compra confirmada sem resposta da simulação · dados expostos entre usuários · eventos simulados direto na UI (sem passar pelo `socket.io-client`) · ausência de testes E2E executáveis.

**Regras que mais custam caro se esquecidas:**
- Busca, filtros, ordenação e paginação vivem na **URL**; mudar filtro reinicia a página; sobrevive a refresh e histórico.
- ETH trafega como **string decimal**, nunca `number`; quantidades inteiras; a cotação da API é a referência final.
- Checkout **revalida** preço/disponibilidade/cupom/taxa antes de confirmar; mudança exige **nova confirmação**.
- Pedido: criação **idempotente** (header `Idempotency-Key`), estados `pending|confirmed|rejected` (terminais: confirmed/rejected), recuperação após refresh/reconexão, sem duplicar. Confirmação só para pedido confirmado. Recibo = **snapshot** imutável.
- Após compra, remover do carrinho **só** itens/quantidades comprados; preservar itens em falhas.
- Carrinho persiste após refresh; itens do visitante são preservados ao autenticar.
- Sessão recuperável após refresh; expiração tratada (navegação e checkout) preservando contexto; logout/troca de usuário limpa cache privado **e** subscriptions.
- Pelo menos uma **atualização otimista com rollback** (favoritos).
- Socket.IO real no cliente; mocks via `@mswjs/socket.io-binding`; eventos `nft.updated` e `order.updated` com identidade estável, recurso e versão; tolerar duplicados/antigos; reconciliar com REST após reconexão; eventos de sessão anterior não atualizam outro usuário; liberar listeners.
- **Skeletons com shimmer** (sem layout shift, respeitando `prefers-reduced-motion`) em catálogo, detalhe e resumo do carrinho.
- Acessibilidade: teclado, foco visível, foco em diálogos/drawers, labels e erros associados, alt em imagens relevantes, feedback acessível (live region) para mutations e eventos em tempo real.
- Larguras de avaliação: **390, 768, 1440**.
- Lighthouse (início e detalhe, mobile e desktop, 3 medições, mediana): Perf ≥90, A11y ≥95, Best Practices ≥95, SEO ≥90. Registrar LCP/CLS/TBT. Sem simplificações só para pontuar.
- Deploy público obrigatório (Vercel recomendado) com mocks e tempo real funcionando; refresh em qualquer rota deve funcionar (rewrite SPA).
- Entrega inclui `README.md` (setup, env, credenciais fictícias, cenários e reset, comandos, como reproduzir falhas) e `ARCHITECTURE.md` (contratos REST e eventos, política de sessão, estado do carrinho, cache, reconciliação REST↔Socket, limitações, decisões de UX, desvios do Figma).

## 3. Stack (obrigatória) e escolhas

React · TypeScript · TanStack Router (file-based, plugin Vite) · TanStack Query · Axios · Socket.IO Client · Tailwind CSS · shadcn/ui · MSW · Playwright · Lighthouse.

Escolhas nossas (livres pelo enunciado): Vite, pnpm, **Tailwind 3.4** (para manter `tailwind.config.js`; v4 usaria `@theme` em CSS, os tokens migram direto), Zod, React Hook Form + `@hookform/resolvers`, `decimal.js`, `lucide-react`, `@fontsource-variable/jetbrains-mono` (self-hosted, por causa do Lighthouse), `@mswjs/socket.io-binding`.

## 4. Estado atual

### Etapa 1 — aplicada pelo Ian
Estrutura de pastas, `tailwind.config.js`, `src/styles/index.css` (tokens), tipos em `src/types/*`.

### Etapa 2 — aplicada e validada (2026-10-24)
Typecheck, lint e build verdes; `e2e/specs/data-layer.spec.ts` cobre o smoke test da seção 9 (11 testes, estáveis com `--repeat-each=5`). Configs criadas: `package.json` (pnpm 10), `tsconfig.json`, `vite.config.ts` (plugin do Router entra na Etapa 3), `eslint.config.js`, `postcss.config.js`, `index.html`, `playwright.config.ts` (só desktop por enquanto). `window.__kurioMocks` só aparece **depois** de `worker.start()`: é o sinal de "mocks prontos" para o Playwright. Arquivos vazios em `src/routes`, `src/realtime`, `src/features`, `lighthouse/` são placeholders das próximas etapas. `public/assets/nfts/` ainda não tem as imagens.
Camada de dados + base do MSW para **auth, catálogo e favoritos**. Carrinho/cotação/pedidos/carteiras/perfil entram junto com cada feature, reaproveitando a infra.

```
src/
├─ app/            env.ts · query-keys.ts · query-client.ts · session-sync.ts
├─ lib/            money.ts (decimal.js) · idempotency.ts
├─ schemas/        common.ts · api.ts · nft.ts · auth.ts          (Zod = contrato de transporte)
├─ services/api/   http.ts (Axios) · errors.ts (ApiError) · session-store.ts
│  └─ endpoints/   auth.ts · nfts.ts · favorites.ts
├─ types/          common · api · nft · user · wallet · cart · quote · order · realtime · index
├─ mocks/          index · browser · runtime · controls · chaos · http-utils · api-path · prng · auth-guard
│  ├─ scenarios/   index.ts
│  ├─ fixtures/    users.ts · nfts.ts
│  ├─ db/          db.ts · seed.ts · crypto.ts
│  └─ handlers/    auth · nfts · favorites · index
└─ main.tsx        (stub: boot MSW → bindSessionToCache → render)
```

### Etapa 3 — shell + catálogo, validada (2026-10-24)
Router file-based com plugin Vite (`routeTree.gen.ts` gerado no dev/build), `app/router.ts` + `app/providers.tsx`, rota raiz com Header (≥md), Footer, MobileTabBar (<md), SkipLink, LiveRegion (`announce()` em `components/feedback/announcer.ts`) e 404. Rotas das próximas etapas existem como `StagePlaceholder` (remover ao implementar). UI base em `components/ui` (button, input, skeleton, slider, select, sheet). Catálogo em `features/catalog`: estado 100% na URL (`zodValidator(nftSearchSchema)` + `stripSearchParams` dos padrões), filtros na sidebar (≥lg) ou drawer (<lg), `keepPreviousData` com grade esmaecida, skeleton/vazio/erro+retry, página além do fim → `replace` para a última. Novo endpoint `GET /nfts/featured` (card "NFT em destaque"). Testes: `e2e/specs/catalog.spec.ts` (itens 1 e 12, out-of-order, 404, overflow) nos projetos desktop 1440 / tablet 768 / mobile 390 — 47 testes, estáveis com `--repeat-each=3`.

Decisões e aprendizados da Etapa 3:
- Imagens: o Figma só exportou 3 artes (SVG com PNG embutido, 2,7 MB). Originais em `assets-src/nfts/`; `pnpm assets` gera WebP 400/800 em `public/assets/nfts/`. `ImageAsset.srcSet` opcional. Mapeamento arte→NFT em `mocks/fixtures/nfts.ts` (macacos dourados reaproveitam as 3 artes → desvio p/ ARCHITECTURE.md). Mudou formato do banco simulado? Incrementar `SCHEMA_VERSION` em `mocks/db/db.ts`.
- Hero/banners/diário são conteúdo estático (`features/catalog/artworks.ts`); hero sem autoplay. Itens fora do escopo usam `<Unavailable>` (não clicável, anuncia "indisponível").
- Busca do header inicia busca nova (limpa filtros); busca mobile mantém filtros (debounce 400ms).
- `.sr-only` dentro de contêiner com overflow precisa de ancestral `relative`, senão alarga o layout no Chrome mobile (bug achado pelo teste de overflow).
- Helper E2E: `resetScenario(page, cenário, path)`; testes só de API usam path sem UI de dados para não consumir falhas do cenário. Page object do catálogo em `e2e/fixtures/catalog.ts`.
- Pendente p/ Etapa 10: chunk principal ~540 kB (175 kB gzip); avaliar divisão (Radix/zod) para o Lighthouse mobile.

### Etapa 4 — auth + sessão, validada (2026-10-24)
`features/auth`: `useSession` (useSyncExternalStore), `useLogin`/`useRegister` (mutations; nos forms usar `mutateAsync`, pois a troca de usuário limpa o cache de mutations), `useLogout` (ação simples: sai localmente mesmo sem rede), `sessionQueryOptions` (`['user', id, 'session']`). Desktop: `AuthDialog` (modal com abas, aberto por `authDialog` store / `useOpenAuth()`); mobile e acesso direto: `/login` e `/register` (`AuthPage`, `?redirect=` validado contra open redirect em `lib/safe-redirect.ts`). Guard `_auth` em `beforeLoad`: sem sessão → `/login?redirect=`; com sessão → `fetchQuery` da sessão (staleTime 5s) detecta expiração na navegação. `SessionExpiredDialog`: expiração parada na tela reautentica sem navegar (mesmo usuário mantém cache; outro usuário → session-sync limpa). `SessionValidation` confirma a sessão restaurada após refresh. Toasts com `sonner` (`components/ui/toaster.tsx`). Erros da API → campos via `applyApiErrors` (`lib/form-errors.ts`). `DialogContent` devolve o foco a quem abriu (necessário porque os diálogos abrem por store, sem `DialogTrigger`). Testes: `e2e/specs/auth.spec.ts` + `e2e/fixtures/auth.ts` (`login`, `openLogin`, `ANA`, `LEO`); expiração parada na tela usa `page.clock` (TTL da sessão simulada: 30 min). Total da suíte: 72 testes (4 skips de mobile), estável com `--repeat-each=2`.
Pendências conhecidas: logout no mobile entra com a sidebar do perfil (Etapa 6); prova de isolamento de cache entre usuários pela UI entra com favoritos (Etapa 5).

### Etapa 5 — detalhe + favoritos + carrinho, validada (2026-10-24)
**Contratos novos** (`schemas/cart.ts`, `schemas/quote.ts`, handlers em `mocks/handlers/cart.ts`, regras puras em `mocks/domain/cart.ts`): `GET /cart` · `POST /cart/items` · `PATCH|DELETE /cart/items/:itemId` (id = `ci_<editionId>`) · `PUT|DELETE /cart/coupon` · `POST /cart/merge` (login) · `POST /quote {network}` · `GET /nfts/featured`. Carrinho do usuário pelo token; do visitante pelo header `X-Cart-Id` (`lib/guest-cart.ts`, `kurio:guest-cart-id`). Toda mutation devolve o `Cart` (vai direto ao cache); `Cart.couponCode` persiste o cupom; `version` muda a cada alteração e entra na chave da cotação. Cupons fixos (`mocks/fixtures/coupons.ts`): `KURIO10` (10%), `LANCAMENTO` (0.5 ETH), `EXPIRADO`; outro código → `COUPON_INVALID`. Taxa: ethereum 0.016 / polygon 0.002 / solana 0.001 (zero com carrinho vazio). Disponibilidade: `maxQuantityFor = min(maxPerOrder, available)`, excesso → 409 `AVAILABILITY_CONFLICT`. Cotações guardadas em `db.quotes` (Etapa 6 usa no pedido). `SCHEMA_VERSION = 3`.
**Cliente**: `features/cart` (`useCartTarget` decide usuário/visitante/expirado; `useCart`, `useQuote` com `keepPreviousData`; mutations; `CartSessionBridge` faz o merge só na transição anonymous→authenticated; `CartCountBadge`), `features/favorites` (`useFavorites`, `useToggleFavorite` = **otimista com rollback**, `FavoriteButton` com `aria-pressed`), `features/nft-detail` (rota com `loader` + `ensureQueryData` + `notFound()`, `pendingComponent` skeleton, `useSuspenseQuery`; galeria com zoom, `EditionPicker` com rádios nativos, limite = estoque − já no carrinho). `NftCard` tem slot `overlay`; `MarketCard` injeta o favorito; `NftRail` (vitrines). Resumo do carrinho = só valores da cotação. Mobile: detalhe e carrinho são telas focadas (sem tab bar/rodapé, barra de ação própria); toasts com `mobileOffset` para não cobrir os botões sobre a imagem.
**Testes**: `e2e/specs/detail-favorites.spec.ts` (itens 2 e 4), `e2e/specs/cart.spec.ts` (item 5), helpers `e2e/fixtures/cart.ts`. Lições: após clique otimista, esperar a confirmação (live region/toast) antes de `reload`/`goto`, senão a requisição é abortada (o handler MSW roda na página). Suíte: 111 testes, estável com `--repeat-each=2`.

### Etapa 6 — checkout + pedidos + perfil + carteiras, validada (2026-10-24)
**Contratos** (schemas `wallet.ts`, `profile.ts`, `order.ts`; handlers `wallets.ts`, `profile.ts`, `orders.ts`; regras em `mocks/domain/orders.ts`): `GET|POST /wallets` · `PUT /wallets/:id` · `POST|DELETE /wallets/:id/connection` (conexão simulada; recusa → 409 `WALLET_REJECTED`, código novo) · `GET|PATCH /profile` · `PUT|DELETE /profile/avatar` (data URL ≤ 400 KB; o cliente reduz para 256px WebP em `lib/image.ts`) · `POST /profile/password` · `POST /orders` (header `Idempotency-Key` obrigatório; mesma chave+corpo → mesmo pedido 200; corpo diferente → 409 `IDEMPOTENCY_CONFLICT`; revalida cotação/versão/disponibilidade → 409 `QUOTE_STALE` ou `AVAILABILITY_CONFLICT`; exige carteira conectada) · `GET /orders?status=pending` · `GET /orders/:id` (de outro usuário → 404). Liquidação "preguiçosa" em `settleDueOrders` (`SETTLE_MS = 2000`): estoque reservado na criação e devolvido na recusa; na confirmação saem do carrinho só itens/quantidades comprados (e o cupom usado). Recibo = snapshot (`OrderItemSnapshot`). Explorer: link simulado → diálogo "Explorador simulado". `SCHEMA_VERSION = 4`; Ana tem carteiras `wal_ana_primary` (MetaMask/Ethereum) e `wal_ana_secondary` (Coinbase/Polygon, `nova.kurio.eth`) e ENS `ana.kurio.eth`; Leo não tem carteiras.
**Cenários novos** (`checkout` em `ScenarioConfig`, "1ª vez" via `mocks/scenario-flags.ts`, zerados no reset): `price-changed` (+10% no 1º item ao criar o pedido), `sold-out-at-checkout`, `order-timeout` (cria o pedido e não responde; reenvio recupera), `payment-declined`, `wallet-rejected`.
**Cliente**: `features/account` (perfil com senha opcional no mesmo "Salvar"; avatar imediato; carteiras principal/secundária com "Igual à carteira principal"; `ProfileSidebar` com "Sair" — logout no mobile; `sessionStore.updateUser` atualiza o header), `features/checkout` (formulário pré-preenchido, rede/tipo de carteira, `WalletConnectionControl`, `OrderReviewDialog` que relê carrinho+cotação do servidor e exige nova confirmação se mudou; reenvio automático com a mesma chave após `NETWORK_ERROR`; banner/bloqueio com pedido pendente; `OrderPage` pending/confirmed/rejected com polling 1s — o socket substitui na Etapa 7). Chave de idempotência por usuário `order:<userId>`, limpa só em estado terminal. Campos novos: `SelectField`, `TextAreaField`, `EnsField`; `useMediaQuery`. Mobile: checkout é tela focada; dados do colecionador em `<details>` (aberto sempre no desktop).
**Testes**: `checkout.spec.ts` (6, 7, revalidação, carteira recusada), `account.spec.ts` (8), contrato de idempotência/isolamento em `data-layer.spec.ts`; helpers `e2e/fixtures/checkout.ts`. Lições: `key` de formulário nunca deve ser `updatedAt` (remonta ao salvar e perde erros); PNG de fixture deve ser gerado (o Chrome recusa PNG "feito à mão"). Suíte: 148 testes, estável com `--repeat-each=2`.

### Etapa 7 — tempo real (Socket.IO), validada (2026-10-24)
Arte `nft4` (macacos dourados de fone) adicionada: Golden Beat/Frequency/Signal e `ARTWORKS.golden` (hero, diário). `SCHEMA_VERSION = 5`.
**Servidor simulado** (`mocks/realtime/`): `socket-handler.ts` usa `ws.link('<origem>/')` + `toSocketIo` (o MSW **remove `/socket.io/` do caminho** antes de casar; conexões sem `EIO` — ex.: HMR do Vite — vão para o servidor real com `connection.server.connect()`). Autenticação pelo pacote CONNECT (`40{"token":…}`); heartbeat manual (ping `"2"` a cada 20s, o binding não faz). `hub.ts`: peers, `publishNft` (público), `publishOrder` (só para o dono), `settleAndPublish` + `startSettlementTicker` (250ms; liquida pedidos e emite `order.updated` + `nft.updated`). Toda mudança de preço/estoque (reserva, devolução, cenários `price-changed`/`sold-out-at-checkout`) publica `nft.updated`. Envelope `{eventId, type, resource, version, occurredAt, userId?, payload}`; versão = `nft.version` / `order.version`. Controles: `__kurioMocks.realtime.{changePrice, changeStock, replayLast, emitStale, emitForeignOrder, setOnline, peerCount}` e `__kurioMocks.setSettleDelay(ms)` (resetados no `reset`).
**Cliente** (`src/realtime/`): `socket-client.ts` com **import dinâmico** de `socket.io-client` (o engine.io guarda a referência a `WebSocket` ao avaliar o módulo; precisa carregar depois do `enableMocking`) e `transports: ['websocket']`. `socket-provider.tsx` (`RealtimeProvider` na raiz): um socket por sessão (token/userId mudou → desliga o anterior, `removeAllListeners`), eventos validados com Zod (`schemas/realtime.ts`), `EventGuard` (dedupe por `eventId` + versão por recurso), `order.updated` de outro usuário descartado, reconexão → `reconcileActiveQueries` (REST), banner `realtime-offline`. `apply-event.ts`: `nft.updated` atualiza detalhe/listas/destaques no cache só se a versão for maior e invalida carrinhos que contêm o NFT (cotação recalculada); toasts quando afeta o carrinho. Pedido: polling saiu; `useOrder` só consulta (5s) enquanto o socket estiver fora (`realtimeStatus`).
**Testes**: `e2e/specs/realtime.spec.ts` (itens 9 e 10) + `e2e/fixtures/realtime.ts`. Suíte: 172 testes, estável com `--repeat-each=2`; conferido também no `vite preview`.
Pendente p/ Etapa 10: chunk principal ~757 kB (245 kB gzip).

### Etapa 8 — acessibilidade e responsividade, validada (2026-10-24)
Auditoria **axe-core** (`@axe-core/playwright`, tags WCAG 2.2 A/AA) em `e2e/specs/a11y.spec.ts` + helper `e2e/fixtures/a11y.ts` (`expectAccessible`, `expectNoHorizontalOverflow`): início, detalhe, carrinho (cheio/vazio), 404, NFT inexistente, login/cadastro com erros, drawer de filtros, modal de login, pagamento, revisão, recibo, perfil e carteiras — **zero violações** nos 3 viewports. Reflow a 320px (zoom 400%) só no projeto desktop (a emulação mobile afasta o zoom e mascara overflow). Correções: `role="img"` no avatar vazio; nome do menu do usuário vem do texto (sr-only "Conta de"); links dentro de frases sempre sublinhados; carrossel do diário focável (`tabIndex=0` + rótulo); sidebar do perfil `min-w-0` (esticava a página no mobile). `e2e/specs/keyboard.spec.ts` (item 11): skip link + foco visível, select de ordenação, drawer (foco preso, Esc devolve foco), rádios de edição com setas, stepper, menu do usuário (WAI-ARIA), foco no 1º campo inválido, revisão do pedido, live region em tempo real, `prefers-reduced-motion` (shimmer desligado), remoção pelo teclado. Contraste dos tokens aprovado pelo axe (nenhum ajuste no `:root`).
**E2E agora rodam contra o build de produção** (`webServer`: `vite build && vite preview`, reaproveita um `pnpm dev` aberto) com `workers: 4` — no servidor de dev, sob carga, requisições estouravam o timeout de 8s (falhas intermitentes que mediam a máquina, não o app). Suíte: 234 testes (14 skips intencionais por viewport), 454/454 com `--repeat-each=2` em 10,3 min.

### Etapa 9 — regressão visual, validada (2026-10-24)
`e2e/specs/visual.spec.ts`: início, detalhe, carrinho e pagamento (o carrinho do Figma: 2×Emerald + 6×Violet + 9×Ivory = **26.846 ETH**), projetos desktop e mobile (tablet pulado). Baselines em `e2e/visual/visual.spec.ts/<nome>-<projeto>-win32.png` (`snapshotPathTemplate`; a plataforma entra no nome porque fontes renderizam diferente em cada SO — em Linux/macOS gerar com `pnpm test:e2e:update visual`). Config: `animations: 'disabled'`, `caret: 'hide'`, `scale: 'css'`, `stylePath: e2e/visual/screenshot.css` (tab bar fixa volta ao fluxo só na captura), **`maxDiffPixels: 100`** (1% deixaria passar um botão deslocado; provado: troca da cor primária reprova). Helpers `e2e/fixtures/visual.ts`: `stabilize` (força imagens lazy, fontes, rede ociosa), `volatile` (máscara de toasts/aviso de conexão), `seedFigmaCart` (espera o id do carrinho de visitante existir). Scripts: `test:e2e:visual`, `test:e2e:update`. Estável: 40/40 com `--repeat-each=5`.
**Bug real corrigido**: `CartSessionBridge` agora faz o merge pelo **estado** (autenticado + carrinho de visitante pendente), não pela transição — recarregar logo após o login abortava o merge e deixava os itens órfãos. Teste de regressão em `cart.spec.ts`. Guarda `mergeInFlight` evita merge duplo (StrictMode).
**Atenção**: o projeto ainda não é um repositório git — as baselines só ficam "versionadas" de fato após `git init` + commit.

Ainda **não existem**: Lighthouse, README/ARCHITECTURE, deploy.

## 5. Decisões de arquitetura (não reverter sem conversar)

**Tipos (`src/types`)**: IDs com `Brand<string,'X'>`; `DecimalString` branded; `ApiErrorCode` derivado de `API_ERROR_CODES` (inclui `INVALID_CREDENTIALS`); `Order` é união discriminada (`PendingOrder | ConfirmedOrder | RejectedOrder`); `OrderReceipt = ConfirmedOrder`; eventos em `realtime.ts` com envelope `{eventId, type, resource, version, occurredAt, userId?, payload}`.

**Zod ↔ tipos**: schemas usam `satisfies z.ZodType<T>`; o cast para tipos "brand" fica **só** em `schemas/common.ts` (`branded<T>()`, `decimalString`). Respostas da API são sempre validadas com `schema.parse` nos endpoints.

**Dinheiro**: tudo por `lib/money.ts` (`eth, add, sub, mulQty, percentOf, markup, compare, formatEth`). `formatEth` preserva a precisão recebida com mínimo de 2 casas (`1.19`, `26.846`, `0.016`). Proibido `Number`/`parseFloat` em ETH.

**HTTP**: instância única Axios (`services/api/http.ts`), timeout 8s, `Authorization` + `X-Request-Id`. Interceptor converte tudo em `ApiError` (cancelamento via AbortSignal passa direto). 401 `SESSION_EXPIRED/UNAUTHENTICATED` chama `sessionStore.markExpired(tokenEnviado)`, que só expira se o token enviado ainda for o atual (evita 401 tardio derrubar sessão nova). Sempre repassar `signal` do Query para o Axios.

**Sessão (`session-store`)**: store externo (use com `useSyncExternalStore`), persistido em `localStorage` (`kurio:session`), estados `anonymous|authenticated|expired`, timer de expiração, sync entre abas. Em `expired` mantém o usuário para retomar contexto. Não guardar senha.

**Query**:
- Chaves em `query-keys.ts`. Catálogo: `['nfts','list',query]` (arrays da query ordenados/deduplicados → chave estável). Dados privados sempre sob `['user', userId, …]`.
- `session-sync`: logout ou troca de usuário → `cancelQueries` + `removeQueries(['user'])` + limpa mutation cache + gancho `onPrivateDataCleared` (usar para encerrar subscriptions do socket na Etapa 7). Expiração do mesmo usuário **não** limpa.
- Política: `staleTime` 30s, `gcTime` 5min, retry ≤2 só para `ApiError.retryable` (rede/5xx), backoff exponencial com jitter (teto 4s), refetch em foco/reconexão. **Mutations não fazem retry automático.**
- `enabled: status === 'authenticated'` em queries privadas.

**Idempotência (`lib/idempotency.ts`)**: chave por tentativa; mesmo conteúdo → mesma chave (inclusive após refresh/timeout); conteúdo diferente → chave nova. Limpar **só** em estado terminal do pedido, **nunca** no logout (senão duplica pedido pendente). Antes de criar pedido, consultar pedido pendente do usuário.

**URL do catálogo**: `nftSearchSchema` (tolerante, `.catch`) para o Router; `nftListParamsSchema` (estrito, 422) para a API; `toListQuery`, `toListParams`. Arrays vão como CSV (`categories=a,b`) ou JSON do router (ambos aceitos). `NFT_PAGE_SIZE = 9`. Na Etapa 3, ligar ao `validateSearch` do Router (adaptador Zod / `fallback().default()`) sem mudar o contrato da API.

**MSW**:
- Handlers são o **único** lugar com regra de negócio fictícia (nada de mock em componente/hook/Axios).
- Todo handler é envolvido por `withConditions(...)` (latência + falhas do cenário ativo).
- Banco em memória persistido em `localStorage` (`kurio:mock-db:v1`), `reset()` restaura estado conhecido. `authenticate(request)` retorna `AuthContext | Response`.
- Senhas no mock: SHA-256 + salt (não é KDF real; documentar limitação).
- Cenários (`mocks/scenarios`): `default` (80ms; usar em demo/Lighthouse/visual), `empty-catalog`, `slow-network` (1,5s), `variable-latency`, `out-of-order`, `server-errors` (GET /nfts falha 3× e a 4ª passa), `offline`, `session-expired` (401 na 4ª requisição autenticada), `flaky-favorites` (1ª mutation 503). **Faltam**: `coupon-invalid`, `price-changed`, `sold-out-at-checkout`, `order-timeout` (timeout **após** criar pedido), `payment-declined`.
- Seleção: `?scenario=` > localStorage > `VITE_MOCK_SCENARIO` > `default`.
- Controle em runtime: `window.__kurioMocks` → `scenarios`, `scenario()`, `setScenario(n)`, `reset(n?)` (limpa `kurio:*` e reseta banco; **recarregar a página depois**), `expireSession()`.
- Fixtures: 36 NFTs determinísticos (PRNG com seed). Os 9 primeiros reproduzem o Figma (Emerald Ape #042 1.19, Sage Nomad #009 1.69, Neon Vessel #552 1.99 riscado 2.29 raro, Cosmic Bloom #118 1.29, Violet Nomad #314 1.39, Ivory Baron #088 1.79, Golden Beat #207 0.99, Golden Frequency #071 0.59, Golden Signal #160 0.39). Ids no formato `emerald-ape-042`; edições `${nftId}--1of1|1of10|1of50|open`. Neon Vessel 1/1 está **esgotada** de propósito (cenário "edição indisponível"). Conferência com o Figma: 2×1.19 + 6×1.39 + 9×1.79 = 26.83; +0.016 de taxa = 26.846.
- **Credenciais fictícias**: `ana@kurio.dev / Kurio@123` (tem 2 favoritos: emerald-ape-042, ivory-baron-088) · `leo@kurio.dev / Kurio@456` (sem favoritos, serve para provar isolamento).

**Contratos REST (mínimo exigido)** — prefixo `/api`:
`POST /auth/register|login|logout` · `GET /auth/session` · `GET /nfts` (q, tab, categories, networks, minPrice, maxPrice, sort, page, pageSize) · `GET /nfts/:id` · `GET /favorites` · `PUT|DELETE /favorites/:nftId` (idempotentes, devolvem `{nftIds}`) · **a criar:** carrinho (consulta/inclusão/alteração/remoção), cotação (cupom, disponibilidade, descontos, taxa, total), pedidos (criar idempotente + consultar estado/recibo), perfil (dados, avatar, senha), carteiras (consultar, cadastrar, atualizar).
Erros: `VALIDATION_ERROR(422, fieldErrors) · INVALID_CREDENTIALS(401) · UNAUTHENTICATED(401) · SESSION_EXPIRED(401) · FORBIDDEN(403) · NOT_FOUND(404) · CONFLICT(409) · AVAILABILITY_CONFLICT(409) · IDEMPOTENCY_CONFLICT(409) · COUPON_INVALID/EXPIRED(422) · QUOTE_STALE(409) · TRANSIENT(5xx, retryable) · NETWORK_ERROR`.

**Rotas (TanStack Router, file-based)**: `/` · `/nfts/$nftId` · `/cart` · `_auth` (guard com `?redirect=`) → `/checkout`, `/orders/$orderId`, `/profile` (layout com sidebar) → `/profile` e `/profile/wallets` · `/login` e `/register` (modal ≥md, página cheia no mobile) · `$` (404). Rotas privadas protegidas em `beforeLoad`.

## 6. Design (Figma) e tokens

Prints em `docs/figma/` (desktop: início, detalhe, carrinho, pagamento, confirmação em modal, login e cadastro em modal, perfil, carteiras; mobile: início, detalhe, carrinho, pagamento com carteira, login, cadastro). Tema **escuro marrom**, **UI inteira monoespaçada** (parece JetBrains Mono; confirmar no Inspect do Figma), acento laranja/âmbar, cards com raios generosos, imagens de macacos NFT (ilustrações), tipografia pequena (~13px corpo).

Tokens em `src/styles/index.css` (HSL, **estimados dos prints**; validar no Figma e ajustar só o `:root`):

| Token | HSL | Uso |
| --- | --- | --- |
| background | 15 29% 6% | fundo da página |
| card | 14 28% 9% | cards, sidebar, rodapé |
| card-elevated / popover | 19 33% 11% | modais |
| primary | 28 59% 56% | CTAs, links, aba ativa |
| primary-foreground | 15 29% 8% | texto sobre laranja |
| foreground | 35 58% 89% | texto creme |
| muted-foreground | 29 41% 64% | descrições, labels |
| secondary / muted | 14 28% 12% | campos, pills |
| border / input | 20 26% 18% | bordas |
| band / accent | 25 53% 15% | faixa marrom do rodapé |
| required | 20 73% 55% | asterisco obrigatório |
| destructive / success / warning | 6 75% 58% / 142 38% 48% / 40 80% 55% | **não existem no Figma**, estados |

Raios: sm 4 · md 6 (botões) · lg 12 (cards) · xl 20 · 2xl 32 (containers mobile). Breakpoints: xs 390, sm 640, md 768, lg 1024, xl 1280, 2xl 1440. `max-w-content` = 1200px. Shimmer: classe `.skeleton` (já no CSS, respeita reduced motion). Gradientes mobile: `bg-primary-gradient`, `bg-hero-gradient`.

**Inconsistências do Figma a registrar no `ARCHITECTURE.md`:**
- Formulário de pagamento e de carteiras repetem campos ("Código de indicação*", "Nome ENS*", perfil/carteira misturados). Manter visualmente; decidir obrigatoriedade.
- Perfil traz "Apelido da carteira" → mapeado para a carteira principal (`UpdateProfileInput.walletNickname`).
- Pill de edição "1/10" duplicada no detalhe; edições modeladas como 1/1, 1/10, 1/50, ABERTA.
- Aba "Avaliações de colecionadores" fora do escopo → exibir só a contagem, sem aparentar funcionalidade.
- Nomes e imagens dos NFTs variam entre telas; mapeamento slug→asset é **provisório** (`/public/assets/nfts/<slug>.webp`); documentar substituição de assets.
- Perfil, carteiras e confirmação não têm frame mobile: derivar do padrão existente.
- Login/cadastro: modal no desktop, página cheia no mobile.
- Carrinho mobile mostra 4 itens e desktop 3 (só ilustrativo).

## 7. Convenções de código

- Alias `@/` → `src/`. TS estrito; sem `any`; sem cast fora de `schemas/common.ts` (exceções comentadas).
- Estrutura por feature em `src/features/<nome>/{api,components,hooks}`; schemas compartilhados em `src/schemas`; UI base em `components/ui` (shadcn customizado) e `components/feedback`.
- Componentes não conhecem Axios, MSW nem chaves de cache: usam hooks da feature. Hooks usam `services/api/endpoints`.
- Estados obrigatórios em toda tela de dados: loading (skeleton), vazio, erro (com retry), sucesso, atualização em segundo plano.
- Mensagens ao usuário em português. Mutations sempre com feedback acessível (toast + live region).
- Erros de validação da API (`fieldErrors`) mapeados para os campos do React Hook Form.
- Commits pequenos por tarefa; não alterar arquivos fora do escopo da etapa sem avisar.

## 8. Comandos esperados (criar no `package.json`)

`dev` (mocks ligados) · `build` · `preview` · `typecheck` (`tsc --noEmit`) · `lint` · `test:e2e` (Playwright) · `test:e2e:update` (baselines visuais) · `audit:lighthouse` · `npx msw init public/ --save` (uma vez).
Playwright: Chromium, projetos desktop (1440), tablet (768) e mobile (390); relatório HTML + traces; cada teste parte de estado isolado (`__kurioMocks.reset` + reload, ou `?scenario=`), relógio e latência controlados.

## 9. Primeiras ações (validação antes de seguir)

1. Conferir se os arquivos da Etapa 2 existem (árvore da seção 4). Se faltarem, avise o Ian: o código foi gerado no chat e precisa ser colado ou reenviado; não o reescreva de memória.
2. Rodar `pnpm install`, `pnpm typecheck`, `pnpm lint` e corrigir erros. Pontos de atenção conhecidos:
   - `src/types/api.ts` precisa do bloco `API_ERROR_CODES` (ajuste da Etapa 2).
   - `mocks/fixtures/nfts.ts`: simplificar para `tokenId: spec.token.padStart(4, '0')` e remover `figmaCartSubtotalCheck` (sobra de conferência).
   - Compatibilidade zod 3 vs 4 e assinaturas do msw 2.x (`HttpResponseResolver`, `delay('infinite')`): ajustar o que o compilador apontar.
   - Rodar `npx msw init public/ --save` e criar `.env` a partir de `.env.example`.
3. Smoke test no navegador (console): `fetch('/api/nfts?categories=musica,jogos&sort=price_asc')`, login errado → 401 `INVALID_CREDENTIALS`, cadastro com e-mail existente → 409 com `fieldErrors.email`, `__kurioMocks.setScenario('server-errors')` (falha 3×, 4ª passa), `__kurioMocks.reset('default')` + reload.
4. Só então começar a Etapa 3.

## 10. Roadmap (cada etapa inclui seus testes Playwright)

| Etapa | Escopo | Aceite principal |
| --- | --- | --- |
| **3** Shell + catálogo | Providers, rota raiz, 404/erro, Header/Footer/MobileTabBar responsivos, `Skeleton`, Início: destaques, busca, filtros (coleções, faixa de preço, rede), ordenação, abas, paginação, estados vazio/erro/retry; tudo na URL | Teste 1 (busca/filtros/ordem/paginação/histórico) e 12 (skeleton + retry); fidelidade 1440/390 |
| **4** Auth + sessão | Login/cadastro (modal desktop, página mobile), validação + erros da API, redirect de retorno, guard `_auth`, expiração, logout, troca de usuário limpando cache | Teste 3 e parte do 11 |
| **5** Detalhe + favoritos + carrinho | Detalhe (galeria, edição, quantidade, limites, inexistente), favoritos otimistas com rollback, carrinho persistente (visitante → login), cupom, resumo vindo da cotação; MSW de carrinho e cotação | Testes 2, 4, 5 |
| **6** Checkout + pedido + carteiras + perfil | Formulário, carteiras principal/secundária, conexão simulada (conectar/recusar/desconectar), revalidação com nova confirmação, pedido idempotente, estados pendente/confirmado/recusado, recibo (snapshot), perfil/avatar/senha; MSW de pedidos, carteiras e perfil; cenários `order-timeout`, `payment-declined`, `price-changed`, `sold-out-at-checkout`, `coupon-invalid` | Testes 6, 7, 8 |
| **7** Tempo real | `socket-client`, provider com ciclo de vida, `apply-event` (dedupe por `eventId`, guarda de versão), reconciliação REST após reconexão, isolamento por sessão, `@mswjs/socket.io-binding` com emissor que muda o banco e emite o evento correspondente; documentar transporte e limitações | Testes 9 e 10 |
| **8** Acessibilidade e responsividade | Foco em dialogs/drawers, labels/erros associados, live regions, contraste, 390/768/1440 sem overflow, zoom | Teste 11 |
| **9** Regressão visual | Baselines de início, detalhe, carrinho e pagamento (desktop e mobile) com dados estáveis | Suíte verde e versionada |
| **10** Performance, docs e deploy | Lighthouse (3 medições, mediana, relatórios HTML/JSON, LCP/CLS/TBT, justificativas), `README.md`, `ARCHITECTURE.md`, Vercel com rewrite SPA, mocks e socket funcionando no build publicado | Metas de score ou justificativa |

Cobertura E2E exigida (12 itens): busca/filtros/ordem/paginação/histórico · detalhe direto e inexistente · cadastro/login/expiração/logout/troca de usuário · favoritos com falha e recuperação · carrinho (quantidades, remoção, cupom, persistência após refresh/login) · compra completa até o recibo · falha de pagamento, clique repetido e timeout com recuperação do mesmo pedido · perfil/avatar/senha/carteiras com erros · mudança de preço/disponibilidade via Socket.IO durante checkout · eventos duplicados/antigos, desconexão e retomada de pedido pendente · teclado, foco de diálogos e validação · skeletons com carregamento lento e retry.

## 11. Prompt sugerido para começar no Claude Code

> Leia `CLAUDE.md` e `docs/DESAFIO.md`. Execute a seção 9 (validar Etapas 1 e 2: instalar, typecheck, lint, smoke test) e corrija o que quebrar, explicando cada correção. Depois proponha o plano detalhado da Etapa 3 (shell + catálogo) em tarefas, com os testes Playwright da etapa, e aguarde meu OK antes de codar.
