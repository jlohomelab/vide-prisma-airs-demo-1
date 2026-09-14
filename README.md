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

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Run Oxlint |
| `npm run preview` | Preview production build |
