# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Prerequisites

- **Node.js >= 20.12** required (Vite 8 / Rolldown uses `node:util.styleText`, added in 20.12)

## Build & Dev Commands

- **Dev server:** `npm run dev` (Vite, defaults to port 5173 — check for port conflicts)
- **Type-check:** `npx tsc --noEmit` (use `tsc -b` for project-reference-aware build)
- **Production build:** `npm run build` (runs `tsc -b && vite build`, outputs to `dist/`)
- **Lint:** `npm run lint` (Oxlint with React and TypeScript plugins)
- **Preview prod build:** `npm run preview`
- **Production serve:** `npm start` (runs `vite preview --host 0.0.0.0 --port 4173`; run `npm run build` first)

## Production Deployment

Build then serve: `npm run build && npm start`. Serves on port 4173 bound to all interfaces. Vite's host header validation is disabled (`preview.allowedHosts: true` in `vite.config.ts`) to allow access via FQDN without a reverse proxy.

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

**`client/src/components/ChatPanel.tsx`** — right-side AI chatbot backed by Portkey AI gateway. It owns:

- Portkey config (base URL, `x-portkey-api-key`, `x-portkey-provider`, model) stored in `localStorage` under `portkey-chat-config`; configurable via a gear icon modal
- **RAG gate**: on every send, calls `searchDocs()` from `client/src/utils/rag.ts`; if no relevant documents are found the LLM is never called and the chat shows `"Unable to access internal data."`
- When context is found, a `system` message with the retrieved document excerpts is prepended to the conversation before the Portkey API call

**`client/src/components/RagAdmin.tsx`** — password-gated admin panel for managing the knowledge base. It owns:

- A `fixed bottom-4 left-4` trigger button that opens a full-screen modal
- Password authentication (hardcoded; see `ADMIN_PASSWORD` constant)
- Two-panel layout: folder tree on the left, document editor on the right
- Full CRUD for documents: create, edit title/content, delete
- **New Folder** creation — admin can add categories beyond the three defaults (`hr`, `expense`, `kb`); new folders are searched by the chatbot immediately
- All changes persist to `localStorage` and are picked up by the RAG search on the next chat message

### RAG utilities

**`client/src/utils/ragSeed.ts`** — seed documents as TypeScript constants (bundled into the JS, never served as public files). Company: PAN Technologies, domain pan.com. Documents: HR policy, leave policy, expense policy, reimbursement guide, password reset guide, IT helpdesk guide.

**`client/src/utils/rag.ts`** — localStorage-backed document store:
- `initRagDocs()` — seeds localStorage from `RAG_SEED_DOCS` on first run (idempotent)
- `loadRagDocs()` — reads manifest + content from localStorage
- `saveDoc(doc)` / `deleteDoc(path)` — called by RagAdmin
- `searchDocs(query, docs)` — keyword frequency scoring; returns top-3 matching document excerpts as a formatted string, or `null` if nothing matches

localStorage keys: `rag-seeded` (init flag), `rag-manifest` (JSON array), `rag-file-<path>` (content per file).

### Duplicate file note

`src/ArchitectureFlowDiagram.tsx` is a near-duplicate of `client/src/components/ArchitectureFlowDiagram.tsx` (missing some comments). The app imports from `client/src/components/` — the `src/` copy is unused.

## Styling

Tailwind CSS v4 utility classes for layout/controls. SVG elements are styled inline (fill, stroke, opacity, filters). Color palette is defined as constants (`CLR_ORANGE`, `CLR_TEAL`, `CLR_BLUE`, `CLR_RED`, `CLR_PURPLE`, `CLR_YELLOW`) in the diagram component. Do not use vendor-specific prefixes in constant names.

## TypeScript

- Target: ES2023, bundler module resolution
- Strict unused-local/parameter checks enabled (`noUnusedLocals`, `noUnusedParameters`)
- `tsconfig.json` uses project references: `tsconfig.app.json` (src) + `tsconfig.node.json` (Vite config)
- Only `src/` is included in the app tsconfig — `client/` is imported but not in the `include` array (relies on bundler resolution)
