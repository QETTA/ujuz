# Runtime Boundary (Web/API/Server) — Canonical

## Why this document exists

The repository historically mixed terminology ("Fastify backend" vs actual Next runtime). This doc defines the **single source of truth** for runtime ownership.

## Canonical boundary

- **Runtime host:** Next.js (`pnpm dev`)
- **HTTP API entrypoints:** `src/app/api/**/route.ts`
- **Reusable domain/service layer:** `src/lib/server/**`
- **Shared non-runtime contracts:** `src/lib/shared/**`

## Layering rules

1. `src/app/api/**` should contain transport concerns only (request parsing, auth guard, response mapping).
2. Business rules and state transitions live in `src/lib/server/**`.
3. Shared contracts (`AppError`, API error body types, token contracts) must be runtime-agnostic in `src/lib/shared/**`.
4. Route handlers should never duplicate domain logic already present in `src/lib/server/**`.

## Fastify dependency policy

- `fastify` may remain as a utility/type dependency for compatibility.
- New API features should not introduce a second standalone HTTP server runtime.
- If Fastify-specific code remains, it must be isolated and documented with migration intent.

## Definition of done for future refactors

- README and scripts reflect Next.js runtime as default.
- Any new endpoint includes:
  - handler in `src/app/api/**/route.ts`
  - tested service function in `src/lib/server/**`
  - consistent error contract via `AppError`/`ApiErrorBody`
- No contradictory runbook text in docs.
