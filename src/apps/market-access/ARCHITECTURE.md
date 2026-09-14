# Market Access — Application Architecture

> **Progressive disclosure** — start at the top. Stop when you have enough context.
>
> This file describes the system **as implemented**. Intended work lives in [`plans/`](plans/README.md).

## Reading order

See [`DEVELOPMENT.md`](DEVELOPMENT.md).

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

**Implementation status:** PR 1–2 complete — create → list → workspace with host-visible disk persistence via `/api/market-access/*`. No package parsing or agent work yet.

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
│   └── PackageFilePicker.tsx   # Click + drop file selection
├── views/
│   ├── AssessmentList.tsx      # List, empty state, persisted cards
│   ├── CreateAssessment.tsx    # Create form + colocated validate()
│   └── AssessmentWorkspace.tsx # Overview + placeholder sections
└── plans/
    ├── README.md
    ├── pr-01-ui-foundation.md  # Historical
    └── pr-02-local-persistence.md  # Historical

server/
├── routes/marketAccessRoutes.ts          # GET/POST /api/market-access/assessments
├── routes/marketAccessRoutes.test.ts
└── services/marketAccessAssessmentService.ts  # Disk create/list/get (+ tests)
```

Default assessments root: `<repo>/.local/market-access/assessments` (override: absolute `AISHELL_MARKET_ACCESS_ASSESSMENTS_ROOT`). Gitignored via root-anchored `/.local/`.

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

## Level 4 — State and persistence

| Concern | Owner |
| --- | --- |
| Fetched list cache | `useState<Assessment[]>` in `MarketAccessContent` after GET/POST |
| Create-form fields / errors | Local `useState` in `CreateAssessment` |
| Package on disk | API writes `assessment.json` + `sources/<file>` + empty `knowledge/` |
| Current view | URL via `useAppSubRoute` |

No `localStorage` or Zustand. Disk via `/api/market-access/*` is the source of truth. The list cache is the last GET (mount or Retry) or POST result. Views consume `Assessment` — no filesystem paths.

### Layers

| Layer | Shape | Owner |
| --- | --- | --- |
| Disk | `AssessmentRecord` | `marketAccessAssessmentService` |
| HTTP JSON | `AssessmentDto` (same fields as the view-model) | `marketAccessRoutes` |
| UI | `Assessment` in [`types.ts`](types.ts) | views via props |
| Client HTTP | `assessmentApi.ts` | `fetch` + `{ error, code }` |

`server/` does not import `src/apps`. The package-format allowlist is duplicated and kept aligned by test.

### On-disk layout

```
<assessmentsRoot>/
  <slug>/
    assessment.json
    sources/
      <sanitized-original-name>
    knowledge/          # empty; no generation yet
```

Directory name is a slug from the product name (80-character cap before collision suffixes `-2`, `-3`). Lookup scans `*/assessment.json` for UUID; never `path.join(root, id)`. Create writes `assessment.json` via temp file then rename. Failed create removes only the directory this request created.

`assessment.json` (`schemaVersion: 1`) stores `id`, `productName`, ISO-8601 `createdAt` / `updatedAt`, and `package` (`originalFileName`, `storedFileName`, `fileSize`, `format`). Unknown schema or invalid JSON is omitted from the list and counted as `skippedCount`.

### API

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/market-access/assessments` | `{ assessments: AssessmentDto[], skippedCount }` |
| POST | `/api/market-access/assessments` | multipart `productName` + `file` → `{ assessment }` |
| GET | `/api/market-access/assessments/:id` | `{ assessment }` or 404 |

No `GET /config`. HTTP bodies do not include host or container paths.

## Level 5 — Current boundaries

Implemented:

- Shell registration, URL routing, left nav
- Create form (product name + one Markdown/DOCX/PPTX package file)
- Client submit checks: name required and ≤ 200 characters; file required; accepted extension; 20 MiB size cap
- Persisted assessments via `/api/market-access/*` (copy bytes unchanged; empty `knowledge/`)
- List cache, skipped-count banner, loading / list error + Retry
- Workspace overview with package metadata and non-authoritative placeholders

Explicitly deferred:

- Package parsing or conversion
- Agent harness and analog research (PR 3+)
- Knowledge repository generation (PR 4+)
- Rename, delete, routed sub-pages, right-panel assistant
- FolderPicker / change-location / displaying the Linux root path
