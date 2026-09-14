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

**Implementation status:** PR 1 complete — create → list → workspace. PR 2 Phases 1–3 complete — `PackageFormat`, client limits, disk/API persistence, and UI wired to `/api/market-access/*`. Next: PR 2 Phase 4 (docs).

## Level 1 — File map

```
src/apps/market-access/
├── DEVELOPMENT.md              # Collaboration / workflow conventions
├── ARCHITECTURE.md             # ← You are here (implemented system)
├── AGENTS.md                   # How to modify the current implementation
├── manifest.tsx                # AppManifest — mainContent + leftNav
├── MarketAccessContent.tsx     # URL router + list cache
├── MarketAccessNav.tsx         # URL-only left nav
├── market-access.css           # Namespaced .market-access-* styles
├── types.ts                    # Assessment view-model (≡ API JSON)
├── assessmentApi.ts            # fetch + { error, code }
├── assessmentApi.test.ts
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

`MarketAccessContent` owns sub-routes via `useAppSubRoute("market-access")` and holds a fetched list cache. Nav reads the same URL; it does not share React state with the canvas.

| URL | View |
| --- | --- |
| `/market-access` | `replace("assessments")` |
| `/market-access/assessments` | List (GET on mount; empty, cards, loading, or error + Retry) |
| `/market-access/assessments/new` | Create form (POST multipart `productName` + `file`) |
| `/market-access/assessments/:id` | Workspace overview (cache hit, or GET `:id`) |
| Other first segments | List + flash; URL replaced to `assessments` |
| `/assessments/:id/...` extra | Stripped to overview |
| Unknown `:id` | List + “Assessment not found.” |

Create validates product name (required, max 200 characters) and one Markdown/DOCX/PPTX package file (accepted extension, 20 MiB cap), POSTs the `File`, puts the returned assessment in the list cache, then navigates to the workspace. Refresh and deep links GET `:id`. Card click only navigates.

`GET/POST /api/market-access/assessments` and `GET /api/market-access/assessments/:id` persist to disk. HTTP JSON matches the `Assessment` view-model (`createdAt` is ISO-8601). No filesystem paths in UI.

## Level 4 — State

| Concern | Owner |
| --- | --- |
| Fetched list cache | `useState<Assessment[]>` in `MarketAccessContent` after GET/POST |
| Create-form fields / errors | Local `useState` in `CreateAssessment` |
| Package on disk | Written by the API (`assessment.json` + `sources/<file>` + empty `knowledge/`); UI stores metadata `{ fileName, fileSize, format }` only |
| Current view | URL via `useAppSubRoute` |

No `localStorage` or Zustand. Disk via `/api/market-access/*` is the source of truth; the list cache may be reconciled by a later GET.

## Level 5 — Current boundaries

Implemented:

- Shell registration, URL routing, left nav
- Create form (product name + one Markdown/DOCX/PPTX package file)
- Client submit checks: name required and ≤ 200 characters; file required; accepted extension; 20 MiB size cap
- Persisted assessments and list cards via `/api/market-access/*`
- Workspace overview with package metadata and non-authoritative placeholders
- Disk persistence API: create copies bytes to `sources/`, mkdir empty `knowledge/`, list returns `skippedCount`, GET by UUID
- Skipped-count banner when a saved record cannot be read

Explicitly deferred:

- Package parsing or conversion
- Agent harness and analog research (PR 3+)
- Knowledge repository generation (PR 4+)
- Rename, delete, routed sub-pages, right-panel assistant
