# Kurio · Marketplace de NFTs

Marketplace de NFTs em **React + TypeScript** (desafio frontend), com descoberta, compra e conta do colecionador em desktop e mobile. APIs, autenticação, carteiras, pagamentos e tempo real são **simulados com MSW**: não há backend nem blockchain real, e tudo roda no navegador.

- **Demo publicada:** https://nft-marketplace-drab-chi.vercel.app (Vercel, com mocks e tempo real ligados)
- **Arquitetura, contratos, cache, tempo real, Lighthouse e desvios do Figma:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- **Enunciado e prints do Figma:** [`docs/`](./docs)

## Stack

| Responsabilidade | Tecnologia |
| --- | --- |
| Interface / linguagem | React 19, TypeScript (estrito) |
| Roteamento | TanStack Router (file-based) |
| Estado remoto | TanStack Query |
| HTTP | Axios (instância única, interceptors) |
| Tempo real | socket.io-client + `@mswjs/socket.io-binding` |
| Estilo / componentes | Tailwind CSS 3.4 + shadcn/ui (Radix) adaptados ao tema |
| Mocks | MSW 2 (REST + WebSocket) |
| Testes | Playwright (E2E, axe-core, regressão visual) |
| Auditoria | Lighthouse 13 |
| Apoio | Vite, pnpm, Zod (contratos), React Hook Form, decimal.js |

## Como rodar

Requisitos: **Node 20+** e **pnpm 10** (`npm i -g pnpm@10` ou `corepack enable`).

```bash
pnpm install
cp .env.example .env      # opcional: os valores padrão já ligam os mocks
pnpm dev                  # http://localhost:5173
```

### Variáveis de ambiente

| Variável | Padrão | Para que serve |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | Base da API REST (interceptada pelo MSW) |
| `VITE_SOCKET_URL` | _(vazio = mesma origem)_ | Origem do Socket.IO (interceptado pelo MSW) |
| `VITE_ENABLE_MOCKS` | `true` | Liga o MSW (dev, demo publicada, testes e Lighthouse) |
| `VITE_MOCK_SCENARIO` | `default` | Cenário inicial (`?scenario=` na URL tem prioridade) |

### Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Desenvolvimento com mocks |
| `pnpm build` | Verificação de tipos + build de produção (`dist/`) |
| `pnpm preview` | Serve o build de produção |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test:e2e` | Playwright completo (desktop 1440, tablet 768, mobile 390) |
| `pnpm test:e2e:visual` | Só a regressão visual |
| `pnpm test:e2e:deploy` | A mesma suíte contra o site publicado (`E2E_BASE_URL` para outra URL) |
| `pnpm test:e2e:update` | Regenera as baselines visuais (após mudança **intencional** de layout) |
| `pnpm audit:lighthouse` | Build + auditoria Lighthouse (3 medições por página e perfil) |
| `pnpm assets` | Regera as imagens WebP a partir dos originais do Figma |

Na primeira execução dos testes: `pnpm exec playwright install chromium`.

## Credenciais fictícias

| E-mail | Senha | Perfil |
| --- | --- | --- |
| `ana@kurio.dev` | `Kurio@123` | 2 carteiras (Principal/MetaMask/Ethereum e Reserva/Coinbase/Polygon), 2 favoritos |
| `leo@kurio.dev` | `Kurio@456` | Conta nova: sem carteiras e sem favoritos (cadastro de carteira; isolamento entre usuários) |

**Cupons:** `KURIO10` (10%), `LANCAMENTO` (0.5 ETH), `EXPIRADO` (expirado). Qualquer outro código é inválido.

As senhas não são guardadas em claro: o banco simulado armazena SHA-256 com salt (ver limitações no `ARCHITECTURE.md`).

## Cenários simulados e reset

Os dados simulados ficam no `localStorage` (sobrevivem ao refresh). Para escolher um cenário:

1. **Pela URL:** `http://localhost:5173/?scenario=payment-declined`. O cenário fica salvo até ser trocado.
2. **Pelo console do navegador:** `__kurioMocks.setScenario('slow-network')` e recarregue a página.
3. **Pela variável** `VITE_MOCK_SCENARIO`.

**Reset completo** (restaura usuários, catálogo, carrinhos, pedidos e carteiras ao estado conhecido):

```js
await __kurioMocks.reset()            // mantém o cenário atual
await __kurioMocks.reset('default')   // reseta e volta ao cenário padrão
// depois: recarregue a página
```

| Cenário | O que simula |
| --- | --- |
| `default` | Sucesso, latência fixa de 80 ms (demo, Lighthouse e regressão visual) |
| `empty-catalog` | Catálogo vazio |
| `slow-network` | Latência de 1,5 s (skeletons) |
| `variable-latency` | Latência pseudoaleatória e determinística entre 100 ms e 1,2 s |
| `out-of-order` | Respostas fora de ordem (a 1ª requisição de cada rota é lenta) |
| `server-errors` | `GET /nfts` responde 500 três vezes (inicial + 2 retries); a 4ª funciona |
| `offline` | Toda requisição falha na conexão |
| `session-expired` | A sessão expira na 4ª requisição autenticada |
| `flaky-favorites` | A 1ª alteração de favorito falha (503); a seguinte funciona |
| `price-changed` | Ao confirmar o pedido, o preço do 1º item sobe 10% |
| `sold-out-at-checkout` | Ao confirmar o pedido, a edição do 1º item esgota |
| `order-timeout` | O pedido é criado, mas a resposta não chega (timeout) |
| `payment-declined` | O pagamento é recusado |
| `wallet-rejected` | A 1ª conexão de carteira é recusada |

### Como reproduzir os fluxos de falha

| Fluxo | Passo a passo |
| --- | --- |
| Skeleton e retry do catálogo | `/?scenario=slow-network` (skeletons) · `/?scenario=server-errors` → "Tentar novamente" |
| Respostas fora de ordem | `/?scenario=out-of-order` e troque filtros rapidamente: a grade mostra sempre o último filtro |
| Favorito com rollback | `/?scenario=flaky-favorites`, entre como Ana e favorite um NFT: o coração volta e aparece o erro |
| Sessão expirada | `/?scenario=session-expired` e navegue logado; ou `__kurioMocks.expireSession()` e abra `/profile` |
| Cupom inválido/expirado | No carrinho, aplique `QUALQUER` ou `EXPIRADO` |
| Preço alterado / esgotado no checkout | `/?scenario=price-changed` ou `sold-out-at-checkout`, compre e clique em "Confirmar pagamento" |
| Timeout com recuperação | `/?scenario=order-timeout`, confirme: após ~8 s aparece "Verificando seu pedido…" e o **mesmo** pedido é recuperado |
| Pagamento recusado | `/?scenario=payment-declined`: o pedido termina recusado e o carrinho é preservado |
| Carteira recusa a conexão | `/?scenario=wallet-rejected` → "Conectar MetaMask" no pagamento |
| Tempo real (preço) | Com um NFT no carrinho, no console: `__kurioMocks.realtime.changePrice('emerald-ape-042', '1.50')` |
| Tempo real (esgotou) | `__kurioMocks.realtime.changeStock('emerald-ape-042--1of50', 0)` |
| Queda do tempo real | `__kurioMocks.realtime.setOnline(false)` … `setOnline(true)`: ao reconectar, o estado é reconciliado pela API |
| Eventos duplicados/antigos | `__kurioMocks.realtime.replayLast()` · `__kurioMocks.realtime.emitStale('emerald-ape-042', '0.10')` (ignorados) |

## Testes

- **249 execuções de teste** (testes × projetos desktop 1440, tablet 768 e mobile 390; 11 pulados de propósito por não se aplicarem ao viewport), em Chromium, contra o build de produção (`vite preview`). Cada teste parte de estado isolado (`__kurioMocks.reset`). Relógio, latência e eventos são controlados.
- Cobrem os 12 itens do enunciado: busca, filtros, ordenação, paginação e histórico · detalhe direto e inexistente · cadastro, login, expiração, logout e troca de usuário · favoritos com falha e recuperação · carrinho (quantidades, remoção, cupom, persistência) · compra completa · recusa, clique repetido e timeout · perfil, avatar, senha e carteiras · preço e disponibilidade via Socket.IO · duplicados, antigos, desconexão e pedido pendente · teclado, foco e validação · skeletons e retry.
- **Acessibilidade:** auditoria axe-core (WCAG 2.2 A/AA) em todas as telas, nos 3 viewports, e reflow a 320 px.
- **Regressão visual:** início, detalhe, carrinho e pagamento, em desktop e mobile. Baselines em `e2e/visual/` (geradas no Windows: em macOS/Linux, gere as suas com `pnpm test:e2e:update visual`, porque a renderização de fontes muda entre sistemas).
- Relatório HTML em `playwright-report/` (`pnpm exec playwright show-report`). Traces e screenshots das falhas ficam em `test-results/`.

## Lighthouse

`pnpm audit:lighthouse` gera, em `lighthouse/reports/latest/`, os relatórios HTML/JSON das 12 medições e o resumo com as medianas ([`summary.md`](./lighthouse/reports/latest/summary.md)). Configuração versionada em `lighthouse/audit.config.mjs`. Resultados e análise no [`ARCHITECTURE.md`](./ARCHITECTURE.md#11-performance-e-lighthouse).

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO |
| --- | --- | ---: | ---: | ---: | ---: |
| Início | desktop | 99 | 100 | 100 | 100 |
| Detalhe | desktop | 99 | 100 | 100 | 100 |
| Início | mobile | 77 | 100 | 100 | 100 |
| Detalhe | mobile | 75 | 100 | 100 | 100 |

## Estrutura

```
src/
├─ app/          providers, router, Query client, chaves de cache, sessão ↔ cache, porta de rede
├─ routes/       rotas file-based (TanStack Router)
├─ features/     catalog · nft-detail · favorites · cart · checkout · account · auth
├─ components/   ui (shadcn adaptado) · layout · feedback · nft
├─ realtime/     socket.io-client, provider, aplicação de eventos
├─ services/api/ Axios, erros, sessão, endpoints
├─ schemas/      contratos Zod (transporte)
├─ types/        tipos de domínio
├─ lib/          dinheiro (decimal.js), idempotência, utilitários
└─ mocks/        MSW: handlers, regras de domínio, banco simulado, cenários, Socket.IO
e2e/             specs, fixtures e baselines visuais
lighthouse/      configuração, runner e relatórios
```

## Deploy

Publicado na **Vercel** a partir da branch `main` (`vercel.json`): `pnpm install --frozen-lockfile` + `pnpm build`, saída `dist/`, rewrite de todas as rotas para o `index.html` (acesso direto e refresh funcionam em qualquer rota) e cache imutável para `/assets`. Nenhuma variável de ambiente é necessária: os mocks (REST e Socket.IO) vêm ligados por padrão no build publicado. Cada push na `main` gera um novo deploy.
