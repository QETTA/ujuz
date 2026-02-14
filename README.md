# UjuZ Monorepo

UjuZ is a **Next.js-first product monorepo** with:

- Web app + API routes (Next.js App Router)
- Shared server/business logic under `src/lib/server`
- Mobile app (`mobile/`, Expo + NativeWind)
- Design token SSOT pipeline (`packages/tokens`)

> Legacy wording that described this repo as "Standalone Fastify backend" is no longer accurate. Fastify remains as a library dependency for selected server utilities/types, while active local development runs through Next.js.

## Runtime Architecture

- **Primary runtime:** `next dev -p 3001`
- **Primary API surface:** `src/app/api/**/route.ts`
- **Shared domain/services:** `src/lib/server/**`
- **Mobile token consumption:** `mobile/global.css` + `mobile/tailwind-theme.js`
- **Token source of truth:** `packages/tokens/src/tokens.ipsoi.json`

See also: `docs/architecture/runtime-boundary.md`.

## Quick Start

### 1) Install

```bash
pnpm install
```

### 2) Environment

```bash
cp .env.example .env.local
# Fill required keys
```

### 3) Run web + API (Next)

```bash
pnpm dev
```

- Web: `http://localhost:3001`
- API example: `http://localhost:3001/api/v1/status`

### 4) Run checks

```bash
pnpm lint
pnpm test
npm run tokens:check
```

## Key Scripts

- `pnpm dev` / `pnpm dev:web`: run Next.js runtime on port 3001.
- `pnpm dev:api`: compatibility alias to `pnpm dev` (used by automation scripts).
- `pnpm dev:mobile`: mobile helper launcher (`scripts/start-mobile.sh`).
- `pnpm emulator`: starts emulator helper (`scripts/run-emulator.sh`).
- `npm run tokens:validate`: token schema/format checks.
- `npm run tokens:build`: regenerate token artifacts.
- `npm run tokens:check`: validate + build + drift check for `packages/tokens/dist`.

## Repository Layout

```text
.
├─ src/
│  ├─ app/                  # Next.js pages + route handlers
│  ├─ components/           # Web UI components
│  ├─ lib/
│  │  ├─ shared/            # Shared contracts (e.g., AppError)
│  │  ├─ server/            # Domain services used by API routes
│  │  └─ ...
│  └─ __tests__/
├─ mobile/                  # Expo + NativeWind app
├─ packages/
│  └─ tokens/               # Design token SSOT + generated outputs
├─ docs/
│  ├─ architecture/
│  └─ design/
└─ scripts/
```

## Refactoring Guardrails (2026 기준)

1. **Single error contract:** use `src/lib/shared/appError.ts` as canonical error model.
2. **Token SSOT only:** edit `packages/tokens/src/tokens.ipsoi.json`, never `dist/*` by hand.
3. **Runtime boundary clarity:** place product APIs under `src/app/api/**`; keep reusable logic in `src/lib/server/**`.
4. **Script compatibility:** if automation references `dev:api`, keep alias intact.

## Notes

- Mobile stack currently uses NativeWind v4 + Tailwind v3 bridge while web uses Tailwind v4.
- Migration strategy is documented in `docs/design/stack-strategy.md`.
