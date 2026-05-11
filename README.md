# Pizza Dough Ferment Calculator

A small web app that estimates bulk fermentation time for pizza dough based on yeast type, baker's percentage, and dough temperature. The fermentation times are looked up against a reference table digitized from a classic pizza yeast chart, with bilinear interpolation between rows (temperature) and columns (yeast %).

## Features

- Supports four yeast/leavening types:
  - Instant Dry Yeast (IDY)
  - Active Dry Yeast (ADY)
  - Cake / Fresh Yeast (CY)
  - Sourdough Starter (SS)
- Toggle between Celsius and Fahrenheit
- Adjustable baker's percentage per yeast type with sensible defaults
- Interpolates fermentation hours between the nearest table cells

## Tech stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) + TypeScript
- [Vitest](https://vitest.dev/) for unit tests
- No backend — entirely client-side

## Getting started

```bash
npm install
npm run dev
```

The dev server prints a local URL (usually `http://localhost:5173`).

### Scripts

| Command            | What it does                              |
| ------------------ | ----------------------------------------- |
| `npm run dev`      | Start the Vite dev server                 |
| `npm run build`    | Type-check and produce a production build |
| `npm run preview`  | Preview the production build locally      |
| `npm test`         | Run the unit tests once                   |
| `npm run test:watch` | Run tests in watch mode                 |

## Project layout

```
src/
  App.tsx                 UI and state
  data/yeastTable.ts      Parsed reference fermentation table
  lib/
    types.ts              Yeast type definitions and labels
    parseYeastCsv.ts      CSV -> structured table parser
    fermentLookup.ts      Bilinear interpolation lookup
    __tests__/            Vitest specs
```

The source data lives in `Pizza Yeast Table - Baker's Yeast.csv` (and the original `.xlsx`) at the repo root, parsed into `src/data/yeastTable.ts`.
