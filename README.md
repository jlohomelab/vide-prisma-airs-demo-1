# Prisma AIRS AI Security Architecture

Interactive step-by-step SVG visualization of the Prisma AIRS AI Security data flow.

![Secured Scenario](docs/secured-scenario.png)

## Features

- **Two scenario modes** — compare unsecured vs. secured AI request paths
- **Step-by-step walkthrough** with auto-play, Previous/Next/Reset controls
- **Animated SVG particles** flowing along data paths in real time
- **Clickable nodes** that jump to relevant steps
- **Risk & capability badges** highlighting security gaps and AIRS gateway features

## Tech Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4

## Prerequisites

- **Node.js >= 20.12** (Vite 8 / Rolldown requires `node:util.styleText`, added in Node 20.12)

## Getting Started

```bash
npm install
npm run dev
```

## Production Deployment

```bash
npm run build
npm start
```

This builds the app to `dist/` and serves it on port 4173 (bound to `0.0.0.0`). To run as a systemd service, point `ExecStart` at `npm start` in the project directory.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 5173) |
| `npm run build` | Production build (outputs to `dist/`) |
| `npm start` | Serve production build (port 4173, all interfaces) |
| `npm run lint` | Run Oxlint |
| `npm run preview` | Preview production build (localhost only) |
