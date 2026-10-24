# Kurio · Marketplace de NFTs

Desafio frontend: marketplace de NFTs em React + TypeScript com APIs, autenticação, carteiras, pagamentos e tempo real **simulados com MSW** (sem backend nem blockchain real).

> Documentação completa (contratos, cenários, arquitetura, Lighthouse e deploy) chega na etapa final. Decisões e estado atual: [`CLAUDE.md`](./CLAUDE.md).

## Rodando localmente

Requer Node 20+ e pnpm 10.

```bash
pnpm install
cp .env.example .env
pnpm dev            # http://localhost:5173 (mocks ligados)
```

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | servidor de desenvolvimento com MSW |
| `pnpm build` / `pnpm preview` | build de produção / servir o build |
| `pnpm typecheck` / `pnpm lint` | TypeScript e ESLint |
| `pnpm test:e2e` | Playwright (desktop 1440, tablet 768, mobile 390) |
| `pnpm test:e2e:visual` | só a regressão visual |
| `pnpm test:e2e:update` | regenera baselines visuais (após mudança intencional de layout) |

## Credenciais fictícias

| E-mail | Senha | Perfil |
| --- | --- | --- |
| `ana@kurio.dev` | `Kurio@123` | 2 carteiras, 2 favoritos |
| `leo@kurio.dev` | `Kurio@456` | conta nova, sem carteiras |

Cupons: `KURIO10` (10%), `LANCAMENTO` (0.5 ETH), `EXPIRADO` (expirado). Restaurar dados: `await __kurioMocks.reset()` no console + recarregar.
