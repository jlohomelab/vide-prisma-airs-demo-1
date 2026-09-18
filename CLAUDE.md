# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Prerequisites

- **Node.js >= 20.12** required (Vite 8 / Rolldown uses `node:util.styleText`, added in 20.12)

## Build & Dev Commands

- **Dev server:** `npm run dev` — runs Vite (port 5173) and the Express API server (port 3001) concurrently. Use `npm run dev:vite` or `npm run dev:server` to start either process alone.
- **Type-check:** `npx tsc --noEmit` (use `tsc -b` for project-reference-aware build)
- **Production build:** `npm run build` (runs `tsc -b && vite build`, outputs to `dist/`)
- **Lint:** `npm run lint` (Oxlint with React and TypeScript plugins)
- **Preview prod build:** `npm run preview`
- **Production serve:** `npm start` — runs `node server.mjs`, which serves the built `dist/` as static files and exposes the RAG API on port 3001 (or `$PORT`). Run `npm run build` first.

## Production Deployment

Build then serve: `npm run build && npm start`. The Express server (`server.mjs`) handles both static-file serving of `dist/` and the `/api` routes, listening on port 3001 (or `$PORT`) bound to all interfaces. `preview.allowedHosts: true` in `vite.config.ts` disables Vite's host header validation for `npm run preview` (not used in production with `npm start`).

## Architecture

Single-page React 19 + TypeScript app built with Vite 8. Tailwind CSS v4 via the `@tailwindcss/vite` plugin (imported as `@import "tailwindcss"` in `src/index.css` — no `tailwind.config` file).

### Entry flow

`index.html` → `src/main.tsx` → `src/App.tsx` → `client/src/components/ArchitectureFlowDiagram.tsx`

### Page layout

The page uses a two-column flex-row layout:
- **Left column** (`flex-1`) — the interactive SVG diagram
- **Right column** (`w-[360px]`, sticky) — the AI chatbot panel (`ChatPanel`)
- **Fixed overlay** (`bottom-4 left-4`) — Admin button rendered by `RagAdmin`

### Key components

**`client/src/components/ArchitectureFlowDiagram.tsx`** is the main UI shell and the interactive SVG diagram. It imports and renders `ChatPanel` and `RagAdmin`. It owns:

- **Two scenario modes** (unsecured / secured) toggled at runtime, each with its own node layout, edge set, and step definitions
- **Step-by-step walkthrough** with Previous/Next/Reset/Auto-play controls; step state determines which nodes and edges are highlighted vs. dimmed (70% opacity for inactive nodes, 30% for inactive edges)
- **Auto-play** enabled by default, cycles through steps at 2s intervals; specific steps can override via `holdMs` (e.g. LLM steps hold for 5s)
- **Clickable nodes** — clicking any node jumps to the earliest step where it is active and pauses auto-play
- **Cumulative edge highlighting** — played edges stay active, except transient edges (gateway→SCM, gateway→intercept) which only light up on their own steps
- **SVG animated particles** using `requestAnimationFrame` + `getPointAtLength` for real-time dot-along-path animation
- **Contextual overlays** — risk callout badges (red) on the unsecured final step; gateway capability badges (blue) on the secured final step
- **Conditional node colors** — nodes support an `activeColor` field that overrides `color` when the node's step is active (used for unsecured LLM: white → red)

All node positions, edge connections, step metadata, and color palette are defined as constants at the top of this file — no external data files.

**`server.mjs`** — Express 5 REST API server for both the RAG knowledge base and LLM configuration. It owns:

- Listens on port 3001 (or `$PORT`), binds to `0.0.0.0`
- Reads/writes `data/rag.json` and `data/config.json` via synchronous `readFileSync`/`writeFileSync`
- Routes: `GET /api/rag/docs` (public), `POST /api/rag/docs` (upsert, auth), `DELETE /api/rag/docs` (auth), `GET /api/config` (auth), `POST /api/config` (auth)
- Auth: `x-admin-password` request header checked by `requireAuth` middleware against hardcoded `"Pal0Alt0"`
- In production (after build): serves `dist/` as static files with SPA fallback (`index.html` for all unmatched routes)
- Permissive CORS (`*`) so the Vite dev server on a different port can reach it

**`data/rag.json`** — persistent JSON store for RAG documents. Structure: `{ "docs": [{ path, title, folder, content }] }`. Single source of truth for the knowledge base (replaces the deleted `ragSeed.ts`). Contains 7 seed documents across 3 folders (`hr`, `expense`, `kb`), including a synthetic employee CSV with PII-like data used to demo AIRS security scanning.

**`data/config.json`** — persistent JSON store for LLM configuration. Structure: `{ portkey: { baseUrl, apiKey, provider, model }, direct: { baseUrl, bearerToken, model } }`. Protected by `requireAuth`; never accessible without the admin password. Created on first save; defaults are embedded in `DEFAULT_CHAT_CONFIG` in `server.mjs`.

**`client/src/components/ChatPanel.tsx`** — right-side AI chatbot with dual-mode LLM support. Accepts a `secured: boolean` prop from `ArchitectureFlowDiagram`. It owns:

- **Two LLM paths** switched by the `secured` prop:
  - `secured=true` → calls Portkey gateway (`POST {baseUrl}/chat/completions` with `x-portkey-api-key` / `x-portkey-provider` headers, `max_tokens: 512`)
  - `secured=false` → calls the LLM directly (`POST {baseUrl}` with `Authorization: Bearer {token}`, `max_completion_tokens: 13107`)
- **LLM config stored server-side** in `data/config.json` via `GET/POST /api/config` (requires admin password). Admin password cached in `localStorage` under key `"Pal0Alt0"` (`ADMIN_PW_KEY`); loaded on component mount and used to auto-fetch config.
- **Gear icon settings modal** — tabbed: "Portkey" tab (4 fields: base URL, API key, provider, model) and "Direct LLM" tab (3 fields: API URL, bearer token, model). Default tab matches current mode. Modal auto-fetches current server config on open when password is stored. Load button triggers manual re-fetch.
- **RAG gate**: on every send, calls `await loadRagDocs()`; passes result to `searchDocs(text, ragDocs)`; server errors silently fall back to empty doc list. If nothing matches, shows `"Unable to access internal data."` without calling the LLM.
- Header badge and accent color reflect current mode: blue = Secured (Portkey), orange = Unsecured (Direct LLM)

**`client/src/components/RagAdmin.tsx`** — password-gated admin panel for managing the knowledge base. It owns:

- A `fixed bottom-4 left-4` trigger button that opens a full-screen modal; password gate resets on every modal open (`authed` reset in `handleClose`)
- Password authentication (hardcoded `ADMIN_PASSWORD = "Pal0Alt0"`); "Authenticated" badge shown in header after login
- Two-panel layout: collapsible folder/file tree on the left, document editor on the right
- Full CRUD for documents: create file within folder, edit title/content (dirty-state tracking with "Unsaved changes" label), delete
- **New Folder** creation — admin can add categories beyond the three defaults (`hr`, `expense`, `kb`); saves a `.keep` placeholder file via `saveDoc`
- All changes persist to the server via `saveDoc(doc, ADMIN_PASSWORD)` / `deleteDoc(path, ADMIN_PASSWORD)`; a server-error banner with retry button is shown if `loadRagDocs()` fails
- No localStorage usage

### RAG utilities

**`client/src/utils/rag.ts`** — HTTP client + search utility. No embedded data, no localStorage. Company: PAN Technologies, domain pan.com.

- `loadRagDocs(): Promise<RagDoc[]>` — `GET /api/rag/docs`; throws on non-OK HTTP
- `saveDoc(doc, adminPassword): Promise<void>` — `POST /api/rag/docs` with `x-admin-password` header
- `deleteDoc(path, adminPassword): Promise<void>` — `DELETE /api/rag/docs` with `x-admin-password` header
- `searchDocs(query, docs)` — pure local keyword frequency scoring; corpus is `folder + title + content` (so folder names like "hr" are searchable); strips stop-words and tokens shorter than 2 chars; for terms ending in "s" also tries the de-pluralised form (e.g. "employees" → matches "employee"); returns top-3 matching document excerpts as a formatted string, or `null` if nothing matches

`ragSeed.ts` has been deleted. Document data lives in `data/rag.json` on the server.

### Dev proxy

`vite.config.ts` proxies `/api/*` → `http://localhost:3001` so that `fetch("/api/rag/docs")` in the client works from the Vite dev server without CORS issues or hardcoded ports.

### Duplicate file note

`src/ArchitectureFlowDiagram.tsx` is a near-duplicate of `client/src/components/ArchitectureFlowDiagram.tsx` (missing some comments). The app imports from `client/src/components/` — the `src/` copy is unused.

## Styling

Tailwind CSS v4 utility classes for layout/controls. SVG elements are styled inline (fill, stroke, opacity, filters). Color palette is defined as constants (`CLR_ORANGE`, `CLR_TEAL`, `CLR_BLUE`, `CLR_RED`, `CLR_PURPLE`, `CLR_YELLOW`) in the diagram component. Do not use vendor-specific prefixes in constant names.

## TypeScript

- Target: ES2023, bundler module resolution
- Strict unused-local/parameter checks enabled (`noUnusedLocals`, `noUnusedParameters`)
- `tsconfig.json` uses project references: `tsconfig.app.json` (src) + `tsconfig.node.json` (Vite config)
- Only `src/` is included in the app tsconfig — `client/` is imported but not in the `include` array (relies on bundler resolution)
