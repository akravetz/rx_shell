# Market Access — Application Architecture

> **Progressive disclosure** — start at the top. Stop when you have enough context.
>
> This file describes the system **as implemented**. Intended work lives in [`plans/`](plans/README.md).

## Reading order

See [`DEVELOPMENT.md`](DEVELOPMENT.md). For the current design, read the [active plan](plans/README.md).

## Level 0 — What Is This?

Market Access is a **local-first** AIShell application for Global Market Access users. It will help them research pharmaceutical **analogs** and build evidence-backed assessments for one product/asset at a time.

The app name stays broad on purpose. An **assessment** is the user-facing workspace for one product/asset. The first workflow is an **AnalogAssessment**; later work may add landscape assessment, evidence research, knowledge exploration, and a possible assistant. Generated synthesis is never inherently authoritative — claims should stay traceable to source material and reviewable by a human.

```
source material / provenance
        ↓
structured or extracted project knowledge
        ↓
generated synthesis / assessment
```

**Implementation status:** PR 1 complete — session-only create → list → workspace. PR 2 Phases 1–2 complete — `PackageFormat`, client limits, and disk/API persistence (`/api/market-access/*`). The UI still uses session state and does not call the API yet. Next: PR 2 Phase 3 (wire UI).

## Level 1 — File map

```
src/apps/market-access/
├── DEVELOPMENT.md              # Collaboration / workflow conventions
├── ARCHITECTURE.md             # ← You are here (implemented system)
├── AGENTS.md                   # How to modify the current implementation
├── manifest.tsx                # AppManifest — mainContent + leftNav
├── MarketAccessContent.tsx     # URL router + in-memory assessments
├── MarketAccessNav.tsx         # URL-only left nav
├── market-access.css           # Namespaced .market-access-* styles
├── types.ts                    # Assessment view-model
├── packageFile.ts              # Package extension/format helpers
├── packageFile.test.ts
├── components/
│   ├── MarketAccessIcons.tsx   # SVG icons
│   └── PackageFilePicker.tsx   # Click + drop file selection (no upload)
├── views/
│   ├── AssessmentList.tsx      # List, empty state, session cards
│   ├── CreateAssessment.tsx    # Create form + colocated validate()
│   └── AssessmentWorkspace.tsx # Overview + placeholder sections
└── plans/
    ├── README.md
    ├── pr-01-ui-foundation.md  # Historical
    └── pr-02-local-persistence.md

server/
├── routes/marketAccessRoutes.ts          # GET/POST /api/market-access/assessments
└── services/marketAccessAssessmentService.ts  # Disk create/list/get (+ tests)
```

Default assessments root: `<repo>/.local/market-access/assessments` (override: absolute `AISHELL_MARKET_ACCESS_ASSESSMENTS_ROOT`).

Shell wiring: imported from [`src/apps/registry.ts`](../../apps/registry.ts); CSS imported from [`src/styles.css`](../../styles.css). Routes registered from [`server/index.ts`](../../../server/index.ts).

## Level 2 — Shell wiring

`marketAccessApp` exports `id: "market-access"`, `mainContent`, and `leftNav`. No panels, commands, or secrets.

## Level 3 — Routing

`MarketAccessContent` owns sub-routes via `useAppSubRoute("market-access")` and holds `useState<Assessment[]>` for the current browser session. Nav reads the same URL; it does not share React state with the canvas.

| URL | View |
| --- | --- |
| `/market-access` | `replace("assessments")` |
| `/market-access/assessments` | List (empty or session cards) |
| `/market-access/assessments/new` | Create form |
| `/market-access/assessments/:id` | Workspace overview |
| Other first segments | List + flash; URL replaced to `assessments` |
| `/assessments/:id/...` extra | Stripped to overview |
| Unknown `:id` | List + “not saved yet” flash |

Create validates product name (required, max 200 characters) and one Markdown/DOCX/PPTX package file (accepted extension, 20 MiB cap), appends an `Assessment` to root state, and navigates to the new workspace. Refresh clears assessments; unknown ids redirect to the list.

`GET/POST /api/market-access/assessments` and `GET /api/market-access/assessments/:id` persist to disk. The UI does not call them yet.

## Level 4 — State

| Concern | Owner |
| --- | --- |
| In-memory assessments | `useState<Assessment[]>` in `MarketAccessContent` |
| Create-form fields / errors | Local `useState` in `CreateAssessment` |
| Package on disk | Written by the API (`assessment.json` + `sources/<file>` + empty `knowledge/`); UI still stores metadata `{ fileName, fileSize, format }` only |
| Current view | URL via `useAppSubRoute` |

No `localStorage` or Zustand. `/api/market-access/*` exists; the UI still uses session state.

## Level 5 — Current boundaries

Implemented:

- Shell registration, URL routing, left nav
- Create form (product name + one Markdown/DOCX/PPTX package file)
- Client submit checks: name required and ≤ 200 characters; file required; accepted extension; 20 MiB size cap
- In-memory session assessments and list cards (UI not yet wired to the API)
- Workspace overview with package metadata and non-authoritative placeholders
- Disk persistence API: create copies bytes to `sources/`, mkdir empty `knowledge/`, list returns `skippedCount`, GET by UUID

Explicitly deferred:

- Wiring the UI to `/api/market-access/*` (PR 2 Phase 3)
- Package parsing or conversion
- Agent harness and analog research (PR 3+)
- Knowledge repository generation (PR 4+)
- Rename, delete, routed sub-pages, right-panel assistant
