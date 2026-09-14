# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

- **Dev server:** `npm run dev` (Vite, defaults to port 5173 — check for port conflicts)
- **Type-check:** `npx tsc --noEmit` (use `tsc -b` for project-reference-aware build)
- **Production build:** `npm run build` (runs `tsc -b && vite build`, outputs to `dist/`)
- **Lint:** `npm run lint` (Oxlint with React and TypeScript plugins)
- **Preview prod build:** `npm run preview`

## Architecture

Single-page React 19 + TypeScript app built with Vite 8. Tailwind CSS v4 via the `@tailwindcss/vite` plugin (imported as `@import "tailwindcss"` in `src/index.css` — no `tailwind.config` file).

### Entry flow

`index.html` → `src/main.tsx` → `src/App.tsx` → `client/src/components/ArchitectureFlowDiagram.tsx`

### Key component

`client/src/components/ArchitectureFlowDiagram.tsx` is the entire application UI — a self-contained interactive SVG diagram visualizing the Prisma AIRS AI Security architecture. It owns:

- **Two scenario modes** (unsecured / secured) toggled at runtime, each with its own node layout, edge set, and step definitions
- **Step-by-step walkthrough** with Previous/Next/Reset/Auto-play controls; step state determines which nodes and edges are highlighted vs. dimmed (70% opacity for inactive nodes, 30% for inactive edges)
- **Auto-play** enabled by default, cycles through steps at 2s intervals; specific steps can override via `holdMs` (e.g. LLM steps hold for 5s)
- **Clickable nodes** — clicking any node jumps to the earliest step where it is active and pauses auto-play
- **Cumulative edge highlighting** — played edges stay active, except transient edges (gateway→SCM, gateway→intercept) which only light up on their own steps
- **SVG animated particles** using `requestAnimationFrame` + `getPointAtLength` for real-time dot-along-path animation
- **Contextual overlays** — risk callout badges (red) on the unsecured final step; gateway capability badges (blue) on the secured final step
- **Conditional node colors** — nodes support an `activeColor` field that overrides `color` when the node's step is active (used for unsecured LLM: white → red)

All node positions, edge connections, step metadata, and color palette are defined as constants at the top of this file — no external data files.

## Styling

Tailwind CSS v4 utility classes for layout/controls. SVG elements are styled inline (fill, stroke, opacity, filters). Color palette is defined as constants (`CLR_ORANGE`, `CLR_TEAL`, `CLR_BLUE`, `CLR_RED`, `CLR_PURPLE`, `CLR_YELLOW`) in the diagram component. Do not use vendor-specific prefixes in constant names.
