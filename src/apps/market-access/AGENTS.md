# Market Access — Agent guidance

Operational rules for safely modifying **this app as it exists**. Workflow lives in [`DEVELOPMENT.md`](DEVELOPMENT.md). Intended work lives in [`plans/`](plans/README.md). Shell chassis rules live in the repository docs linked from `DEVELOPMENT.md`.

## Current status

**PR 1–2 are complete.** Create → list → workspace with product name, package metadata, and host-visible disk persistence via `/api/market-access/*`. No parsing or agent work yet.

Historical: [`plans/pr-01-ui-foundation.md`](plans/pr-01-ui-foundation.md), [`plans/pr-02-local-persistence.md`](plans/pr-02-local-persistence.md). Next intended work: PR 3 (documentation-only research / ADR) — do not start it unless asked.

## Conventions

See [`APP_DEVELOPMENT_GUIDE.md`](../../../APP_DEVELOPMENT_GUIDE.md) and [`.agents/AGENTS.md`](../../../.agents/AGENTS.md). App-specific highlights:

- **App ID / CSS:** `market-access` / `.market-access-*` (design tokens only)
- **Routing:** `useAppSubRoute("market-access")` — preserve shell query params
- **Icons:** SVG in `components/MarketAccessIcons.tsx` only; no emoji
- **Layout:** no nested `<main>`; views use `role="region"` + `aria-labelledby`
- **Left nav:** shell `nav-item` / `nav-item-icon` / `nav-item-label`
- **Spelling:** `analog` / `analogs` / `Analog` / `AnalogAssessment` — never “analogue”
- **Assessment view-model:** store package `{ fileName, fileSize, format }` only — not the `File` blob or a filesystem path. `createdAt` is ISO-8601, matching the API JSON.

## File organization

| What | Where |
| --- | --- |
| Router + list cache | `MarketAccessContent.tsx` |
| Client HTTP | `assessmentApi.ts` (`fetch` + `{ error, code }`) |
| Views / components | `views/` / `components/` |
| Types | `types.ts` |
| Package helpers | `packageFile.ts` (+ `packageFile.test.ts`) |
| Styles | `market-access.css` |
| Assessment API | `server/routes/marketAccessRoutes.ts` |
| Assessment disk service | `server/services/marketAccessAssessmentService.ts` |

Do not import `src/apps` from `server/`. Do not add FolderPicker or agent modules unless the active plan says so. Default disk root is `<repo>/.local/market-access/assessments`. Each assessment dir is `assessment.json` + `sources/` + empty `knowledge/` only. Do not print that path in the UI.

## Verification

**Automated (every change):** `npm run check`; `npm test market-access` when touching client helpers; `npm test marketAccess` when touching the service or routes.

**Manual smoke (after routing, create, list, or workspace changes):**

[ ] 1. Create assessment (name + Markdown, Word, or PowerPoint package) → workspace shows metadata including format → **All assessments** shows the new card without a refresh → refresh the page → reopen from the list card
[ ] 2. Create stays enabled; submit rejects blank/over-200-character names, missing file, `.ppt` / other rejected extensions, and files over 20 MiB (`role="alert"`)
[ ] 3. Unknown `/assessments/<id>` → list + “Assessment not found.”
[ ] 4. API down → list error + Retry (no Linux root path on screen). DevTools → Network → block `/api/market-access/assessments` → refresh → unblock → Retry
[ ] 5. `?nav=collapsed` preserved when navigating; collapsed nav still shows icons; no nested `<main>`; no emoji

## Common mistakes

1. Hand-rolled `pushState` — use `useAppSubRoute`
2. Hard-coded colors or custom nav blocks (breaks collapsed mode)
3. Storing `File` blobs or filesystem paths in assessment state
4. Inline SVG / emoji outside `MarketAccessIcons.tsx`
