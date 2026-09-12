# Market Access — Agent guidance

Operational rules for safely modifying **this app as it exists**. Workflow lives in [`DEVELOPMENT.md`](DEVELOPMENT.md). Intended work lives in [`plans/`](plans/README.md). Shell chassis rules live in the repository docs linked from `DEVELOPMENT.md`.

## Current status

**PR 1 (UI foundation) is complete.** Session-only create → list → workspace with product name and package file metadata. No parsing or agent work yet.

**PR 2 Phases 1–2 are complete** — `PackageFormat`, client limits, and `/api/market-access/*` disk persistence. The UI still uses session state. Next: **PR 2 Phase 3** (wire UI). Historical design: [`plans/pr-01-ui-foundation.md`](plans/pr-01-ui-foundation.md). Active plan: [`plans/pr-02-local-persistence.md`](plans/pr-02-local-persistence.md).

## Conventions

See [`APP_DEVELOPMENT_GUIDE.md`](../../../APP_DEVELOPMENT_GUIDE.md) and [`.agents/AGENTS.md`](../../../.agents/AGENTS.md). App-specific highlights:

- **App ID / CSS:** `market-access` / `.market-access-*` (design tokens only)
- **Routing:** `useAppSubRoute("market-access")` — preserve shell query params
- **Icons:** SVG in `components/MarketAccessIcons.tsx` only; no emoji
- **Layout:** no nested `<main>`; views use `role="region"` + `aria-labelledby`
- **Left nav:** shell `nav-item` / `nav-item-icon` / `nav-item-label`
- **Spelling:** `analog` / `analogs` / `Analog` / `AnalogAssessment` — never “analogue”
- **Session data:** store package `{ fileName, fileSize, format }` only — not the `File` blob or a path

## File organization

| What | Where |
| --- | --- |
| Router + session state | `MarketAccessContent.tsx` |
| Views / components | `views/` / `components/` |
| Types | `types.ts` |
| Package helpers | `packageFile.ts` (+ `packageFile.test.ts`) |
| Styles | `market-access.css` |
| Assessment API | `server/routes/marketAccessRoutes.ts` |
| Assessment disk service | `server/services/marketAccessAssessmentService.ts` |

Do not import `src/apps` from `server/`. Do not add FolderPicker or agent modules unless the active plan says so. Default disk root is `<repo>/.local/market-access/assessments`. Each assessment dir is `assessment.json` + `sources/` + empty `knowledge/` only.

## Verification

**Automated (every change):** `npm run check`; `npm test market-access` when touching client helpers; `npm test marketAccess` when touching the service or routes.

**Manual smoke (after routing, create, list, or workspace changes):**

[x] 1. Create assessment (name + Markdown, Word, or PowerPoint package) → workspace shows metadata including format → **All assessments** → reopen from list card
[x] 2. Create stays enabled; submit rejects blank/over-200-character names, missing file, `.ppt` / other rejected extensions, and files over 20 MiB (`role="alert"`)
[x] 3. Refresh clears session assessments; unknown `/assessments/<id>` → list + “not saved yet” banner
[x] 4. `?nav=collapsed` preserved when navigating; collapsed nav still shows icons

## Common mistakes

1. Hand-rolled `pushState` — use `useAppSubRoute`
2. Hard-coded colors or custom nav blocks (breaks collapsed mode)
3. Storing `File` blobs or filesystem paths in assessment state
4. Inline SVG / emoji outside `MarketAccessIcons.tsx`
