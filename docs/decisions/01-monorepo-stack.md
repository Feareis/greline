# 01 — Monorepo stack

## Decision

Next.js (web) + Expo (mobile) + TypeScript + pnpm workspaces.

## Rationale

- Business logic, types, validation, services and hooks are shared through `packages/*`.
- UI components are NOT shared: each platform is optimized independently.
- A single React version across the workspace, aligned on the Expo SDK.
- Turborepo is not needed yet; it can be added later if build times grow.
