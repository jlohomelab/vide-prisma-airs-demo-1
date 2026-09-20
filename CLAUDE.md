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

## Environment Variables

Copy `.env.example` to `.env` and fill in secrets before running. Never commit `.env`.

| Variable | Side | Description |
|---|---|---|
| `ADMIN_PASSWORD` | Server only | Password for all admin API calls (`x-admin-password` header) |
| `ADMIN_USERNAME` | Server only | Default admin login username (default: `admin`) |
| `VITE_PORTKEY_BASE_URL` | Client + Server | Default Portkey gateway base URL |
| `VITE_PORTKEY_PROVIDER` | Client + Server | Default `x-portkey-provider` value |
| `VITE_PORTKEY_MODEL` | Client + Server | Default model for Portkey mode |
| `VITE_PORTKEY_SCM_REPORT_URL` | Client + Server | URL template for "View Report" button; use `${sessionId}` as placeholder |
| `VITE_DIRECT_BASE_URL` | Client + Server | Default direct LLM endpoint URL |
| `VITE_DIRECT_MODEL` | Client + Server | Default model for direct LLM mode |
| `PORTKEY_API_KEY` | Server only | Portkey API key — set in Azure App Service Configuration, never in `.env` |
| `DIRECT_BEARER_TOKEN` | Server only | Direct LLM bearer token — set in Azure App Service Configuration, never in `.env` |

`VITE_*` variables are bundled into the client JavaScript at build time — do not put secrets there. API keys and bearer tokens are stored server-side in `data/config.json` (managed via Admin Console) or injected via Azure App Service environment variables (`PORTKEY_API_KEY`, `DIRECT_BEARER_TOKEN`). The server's `loadConfig()` overlays these env vars on top of `data/config.json` at runtime, so Azure env vars always take priority.

## Production Deployment

Build then serve: `npm run build && npm start`. The Express server (`server.mjs`) handles both static-file serving of `dist/` and the `/api` routes, listening on port 3001 (or `$PORT`) bound to all interfaces. `preview.allowedHosts: true` in `vite.config.ts` disables Vite's host header validation for `npm run preview` (not used in production with `npm start`).

## Architecture

Single-page React 19 + TypeScript app built with Vite 8. Tailwind CSS v4 via the `@tailwindcss/vite` plugin (imported as `@import "tailwindcss"` in `src/index.css` — no `tailwind.config` file). Global font scale: `html { font-size: 110% }` in `src/index.css`.

### Entry flow

`index.html` → `src/main.tsx` → `src/App.tsx` → `client/src/components/ArchitectureFlowDiagram.tsx`

### Page layout

Two-column flex-row layout:
- **Left column** (`flex-1`) — interactive SVG diagram, step controls, legend
- **Right column** (`w-[420px]`, sticky, 70/30 height split):
  - Top 70%: `ChatPanel` — AI chatbot
  - Bottom 30%: API Response box — raw JSON from the last LLM/gateway call
- **Fixed overlays** (`bottom-4`):
  - `left-4` — light/dark theme toggle button
  - `left-[70px]` — language switcher button (cycles EN → 繁中 → 简中)
  - `left-30` — Admin Console button (rendered by `AdminPage`)

### Key components

**`client/src/components/ArchitectureFlowDiagram.tsx`** is the main UI shell. It imports and renders `ChatPanel` and `AdminPage`. It owns:

- **Two scenario modes** (unsecured / secured) toggled at runtime, each with its own node layout, edge set, and step definitions (Step 0–3 unsecured, Step 0–5 secured)
- **Step-by-step walkthrough** with Previous/Next/Reset/Auto-play controls; step state determines which nodes and edges are highlighted vs. dimmed
- **Auto-play** cycles through steps; specific steps can override hold time via `holdMs`
- **Clickable nodes** — clicking any node jumps to the earliest step where it is active and pauses auto-play
- **Cumulative edge highlighting** — played edges stay active, except transient edges (gateway→SCM, gateway→intercept)
- **SVG animated particles** using `requestAnimationFrame` + `getPointAtLength`
- **Contextual overlays** — risk callout badges (red) on the unsecured final step; gateway capability badges (blue) on the secured final step
- **Conditional node colors** — nodes support an `activeColor` field that overrides `color` when active (unsecured LLM: white → red)
- **Chat-phase live highlighting** — a `ChatPhase` state machine (`idle | typing | backend | processing | resp0–resp3 | endpoint`) overrides step-based node/edge highlighting in response to real chat events (focus, send, response received). Transitions are driven by callbacks from `ChatPanel` (`onInputFocus`, `onInputBlur`, `onSend`, `onResponse`, `onBlocked`). When `onBlocked` fires in secured mode, the diagram immediately jumps to step 3 (guardrails) and `chatPhase` returns to `idle`.
- **Attack simulation labels** — three clickable SVG pill labels (⚡ Prompt Injection, Sensitive Data Retrieval, Malicious URL in Response) appear below the Endpoint node whenever it is active. Clicking a label sets `pendingAttack` state and passes it to `ChatPanel` via `pendingMessage` prop, which calls `sendMessage(textOverride)` to auto-send the attack scenario immediately. Step 0 starts with all nodes inactive; labels first appear at step 1.
- **API Response box** — displays the last LLM/gateway response as a collapsible syntax-highlighted JSON tree (`JsonTree` component); "View Report ↗" button appears when a `session_id` is found in `hook_results`; `scmUrlTemplate` is loaded from `/api/config` on mount (using the stored admin token) so it survives page reloads without re-saving config
- **ThemeContext** — provides `darkMode: boolean` and `toggleTheme()` to all child components; node fills, borders, and text colors switch between dark and light
- **LanguageContext** — provides `lang`, `setLang`, and `t(key, vars?)` to all child components; persists selection to `localStorage["app-language"]`; defaults to `"en"`

All node positions, edge connections, step metadata, and color palette are defined as constants at the top of this file — no external data files.

**`server.mjs`** — Express 5 REST API server. It owns:

- Listens on port 3001 (or `$PORT`), binds to `0.0.0.0`
- Reads/writes `data/rag.json`, `data/config.json`, and `data/users.json` via synchronous `readFileSync`/`writeFileSync`
- `loadConfig()` merges `data/config.json` with env vars at runtime: `VITE_PORTKEY_*` / `PORTKEY_API_KEY` / `VITE_DIRECT_*` / `DIRECT_BEARER_TOKEN` take priority over stored values — enables Azure App Service Configuration to inject credentials without file changes
- Auth: `x-admin-password` request header checked by `requireAuth` middleware against `ADMIN_PASSWORD` env var
- CORS: `Access-Control-Allow-Methods` includes `PATCH` (required for change-password endpoint)
- Routes:
  - `GET /api/rag/docs` — public; returns all RAG documents
  - `POST /api/rag/docs` — upsert a document (auth)
  - `DELETE /api/rag/docs` — delete a document (auth)
  - `GET /api/config` — return LLM config (auth)
  - `POST /api/config` — save LLM config (auth)
  - `POST /api/login` — verify username + password against env admin or `data/users.json`; returns `{ token }` on success
  - `GET /api/users` — list extra admin users without passwords (auth)
  - `POST /api/users` — add admin user `{ username, password }` — password hashed with scrypt before saving (auth)
  - `PATCH /api/users/:username` — change password for an existing user `{ password }` — re-hashed before saving (auth)
  - `DELETE /api/users/:username` — remove admin user (auth)
- In production: serves `dist/` as static files with SPA fallback
- Permissive CORS (`*`) for Vite dev server compatibility

**`data/rag.json`** — RAG documents store. Structure: `{ "docs": [{ path, title, folder, content }] }`. Contains seed documents across 3 folders (`hr`, `expense`, `kb`), including a synthetic employee CSV with PII-like data used to demo AIRS scanning.

**`data/config.json`** — LLM config store. Structure: `{ portkey: { baseUrl, apiKey, provider, model, scmReportUrl }, direct: { baseUrl, bearerToken, model } }`. Protected by `requireAuth`; created on first save.

**`data/users.json`** — Extra admin users store. Structure: `{ "users": [{ username, password }] }`. Passwords are hashed with `crypto.scrypt` (format: `scrypt:{hex_salt}:{hex_hash}`); a plaintext-fallback in `verifyPassword` transparently upgrades legacy entries on first successful login. The default admin (from env) is not stored here. Created on first user addition.

**`client/src/components/ChatPanel.tsx`** — AI chatbot panel (right column, top 70%). Accepts `secured: boolean` and event callbacks from `ArchitectureFlowDiagram`. It owns:

- **Two LLM paths** switched by `secured` prop:
  - `secured=true` → `POST {baseUrl}/chat/completions` with `x-portkey-api-key` / `x-portkey-provider` headers
  - `secured=false` → `POST {baseUrl}` with `Authorization: Bearer {token}`
- **LLM config** loaded from `GET /api/config` on mount using the stored admin token from `localStorage["chat-admin-password"]`
- **Credential gate** — when no admin token is stored in `localStorage`, the chat area shows a ⚙ prompt to configure LLM settings, and the textarea + send button are disabled
- **RAG gate**: calls `loadRagDocs()` + `searchDocs()` on every send; returns `"Unable to access internal data."` if no match without calling the LLM
- **Clear button** — header button (visible only when messages exist) clears the chat history
- **Block detection**: parses `hook_results.before_request_hooks[].checks[].data.prompt_detected` and `after_request_hooks[].checks[].data.response_detected` for specific flags (`dlp`, `agent`, `injection`, `malicious_code`, `topic_violation`, `toxic_content`, `url_cats`); displays a flag-specific violation message. Falls back to a generic gateway-blocked message if no flag is matched
- **Event callbacks**: `onInputFocus`, `onInputBlur`, `onSend`, `onResponse`, `onBlocked` — used by `ArchitectureFlowDiagram` to drive the chat-phase node highlighting; `onBlocked` fires instead of `onResponse` when a blocked response is detected
- **Attack trigger**: accepts `pendingMessage` prop and `onMessageConsumed` callback; when `pendingMessage` is set, calls `sendMessage(textOverride)` immediately, bypassing input state

**`client/src/components/AdminPage.tsx`** — Combined admin console. Renders a `fixed bottom-4 left-30` trigger button. It owns:

- **Auto-authentication**: on open, checks `localStorage["chat-admin-password"]`; if found, skips the login form
- **Login gate**: username + password form → `POST /api/login` → stores returned token in `localStorage["chat-admin-password"]`
- **Three tabs** (visible after login):
  - **Chat Settings** — Portkey config (baseUrl, apiKey, provider, model, SCM Report URL) and Direct LLM config (baseUrl, bearerToken, model); load/save via `GET/POST /api/config`; emits `onScmReportUrl` on save
  - **Knowledge Base** — full RAG document CRUD: folder tree, file list, title/content editor, new folder/file creation, delete; uses stored token for API calls
  - **Users** — list extra admin users, add user (email as username + password), change password (inline expand per row), delete user; calls `/api/users` endpoints
- **Auto-reload on save** — closing the panel after a successful Chat Settings save triggers `window.location.reload()` (tracked via `configSavedRef`); on reload the stored token is present so config loads immediately without re-logging in
- **Logout** — clears `localStorage["chat-admin-password"]` and resets auth state

**`client/src/components/JsonTree.tsx`** — Collapsible, syntax-highlighted JSON tree viewer used by the API Response box. Features: color-coded types (keys blue, strings green, numbers orange, booleans purple, null gray), `▶`/`▼` toggle on objects/arrays, auto-expands first 2 levels, shows item/key count when collapsed, truncates strings over 120 chars with an expand button. Accepts `data: unknown` and `darkMode: boolean`.

**`client/src/components/RagAdmin.tsx`** — Legacy standalone admin panel. Superseded by `AdminPage` and no longer rendered; kept in the codebase but unused.

**`client/src/contexts/ThemeContext.tsx`** — React context for light/dark mode. Provides `{ darkMode: boolean, toggleTheme: () => void }`. Components call `useTheme()` to read the current mode and apply themed colors.

**`client/src/contexts/LanguageContext.tsx`** — React context for i18n. Provides `{ lang, setLang, t(key, vars?) }`. Persists to `localStorage["app-language"]`; supports `"en"`, `"zh-TW"`, `"zh-CN"`. The `t()` helper does `{var}` template substitution. `LANG_LABELS` maps codes to display labels (Eng / 繁中 / 简中).

**`client/src/i18n/translations.ts`** — All user-visible strings for all three languages (82+ keys). Typed with `satisfies Record<string, string>` so TypeScript enforces all languages share the same key set. Key namespaces: `diagram.*`, `step.*`, `risk.*`, `badge.*`, `chat.*`, `violation.*`, `admin.*`, `error.*`, `json.*`, `attack.*`.

### RAG utilities

**`client/src/utils/rag.ts`** — HTTP client + search utility. Company: PAN Technologies, domain pan.com.

- `loadRagDocs(): Promise<RagDoc[]>` — `GET /api/rag/docs`; throws on non-OK HTTP
- `saveDoc(doc, adminPassword): Promise<void>` — `POST /api/rag/docs` with `x-admin-password` header
- `deleteDoc(path, adminPassword): Promise<void>` — `DELETE /api/rag/docs` with `x-admin-password` header
- `searchDocs(query, docs)` — pure local keyword frequency scoring; corpus is `folder + title + content`; strips stop-words and tokens shorter than 2 chars; de-pluralises terms ending in "s"; returns top-3 matching document excerpts as a formatted string, or `null` if nothing matches

### Dev proxy

`vite.config.ts` proxies `/api/*` → `http://localhost:3001` so that `fetch("/api/rag/docs")` works from the Vite dev server without CORS issues or hardcoded ports.

### Duplicate file note

`src/ArchitectureFlowDiagram.tsx` is a near-duplicate of `client/src/components/ArchitectureFlowDiagram.tsx`. The app imports from `client/src/components/` — the `src/` copy is unused.

## Styling

Tailwind CSS v4 utility classes for layout/controls. SVG elements are styled inline. Color palette constants (`CLR_ORANGE`, `CLR_TEAL`, `CLR_BLUE`, `CLR_RED`, `CLR_PURPLE`, `CLR_YELLOW`) are defined in the diagram component. Do not use vendor-specific prefixes in constant names. Theme-aware colors are derived via `buildTheme(darkMode)` helpers local to each component.

## TypeScript

- Target: ES2023, bundler module resolution
- Strict unused-local/parameter checks enabled (`noUnusedLocals`, `noUnusedParameters`)
- `tsconfig.json` uses project references: `tsconfig.app.json` (src) + `tsconfig.node.json` (Vite config)
- Only `src/` is included in the app tsconfig — `client/` is imported but not in the `include` array (relies on bundler resolution)
