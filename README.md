# Prisma AIRS AI Security Architecture

Interactive step-by-step SVG visualization of the Prisma AIRS AI Security data flow.

![Secured Scenario](docs/secured-scenario.png)

## Features

### Architecture Diagram
- **Two scenario modes** — compare unsecured vs. secured AI request paths
- **Step-by-step walkthrough** with auto-play, Previous/Next/Reset controls
- **Animated SVG particles** flowing along data paths in real time
- **Clickable nodes** that jump to relevant steps
- **Risk & capability badges** highlighting security gaps and AIRS gateway features

### AI Chatbot (RAG-backed, dual-mode)
- **Right-side chat panel** that mirrors the active diagram mode:
  - **Secured mode** → routes through [Portkey AI gateway](https://portkey.ai)
  - **Unsecured mode** → calls the LLM directly with a Bearer token
- **Retrieval-Augmented Generation** — answers are grounded in internal documents only; unrelated questions return `"Unable to access internal data."` without calling the LLM
- **Configurable per mode** — click the gear icon (top-right of chat panel) to configure Portkey settings or Direct LLM settings in separate tabs; configuration is saved server-side and persists across browsers
- Default model: `gpt-4.1-mini`

### Knowledge Base Admin
- **Admin panel** (lock icon, bottom-left corner) for managing internal documents
- Password-protected; create, edit, and delete documents across all folders
- **Extensible folders** — add new categories (e.g. `employees`, `finance`) beyond the three defaults
- Seed documents cover HR policy, leave entitlements, expense policy, reimbursement guide, password reset, and IT helpdesk — all set in the fictional company **PAN Technologies** (`pan.com`)
- Documents stored in `data/rag.json` on the server (never exposed as public files)

## Tech Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4
- Express 5 (REST API for RAG docs and LLM config)
- Portkey AI gateway (secured mode) / direct LLM (unsecured mode)

## Prerequisites

- **Node.js >= 20.12** (Vite 8 / Rolldown requires `node:util.styleText`, added in Node 20.12)

## Getting Started

```bash
npm install
npm run dev
```

This starts both the Vite dev server (port 5173) and the Express API server (port 3001) concurrently.

## Production Deployment

```bash
npm run build
npm start
```

This builds the app to `dist/` and starts `server.mjs` on port 3001 (bound to `0.0.0.0`). The Express server serves the built frontend and handles all `/api` routes. To run as a systemd service, point `ExecStart` at `npm start` in the project directory.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 5173) + Express API server (port 3001) |
| `npm run dev:vite` | Start Vite dev server only |
| `npm run dev:server` | Start Express API server only |
| `npm run build` | Production build (outputs to `dist/`) |
| `npm start` | Serve production build via Express on port 3001 |
| `npm run lint` | Run Oxlint |
| `npm run preview` | Preview production build (localhost only) |
