# Music Creator — Development Guidelines

> App-specific rules for AI agents and humans working in `src/apps/music-creator/`.

Read [`ARCHITECTURE.md`](ARCHITECTURE.md) first for routing, file layout, and data model. Stop when you have enough context for your task.

Shell-level patterns: [APP_DEVELOPMENT_GUIDE.md](../../APP_DEVELOPMENT_GUIDE.md) and [ARCHITECTURE.md](../../ARCHITECTURE.md) (Levels 0–3).

---

## How to use this file

**`ARCHITECTURE.md`** = what the system is (progressive disclosure, design decisions).

**`AGENTS.md`** (this file) = how to work on it safely (conventions, boundaries, checklists).

Update this file when a milestone phase ships new conventions or verification steps. Stable rules (routing, CSS, state) stay; milestone checklists and “do not add yet” lists change as work progresses.

---

## Current progress (Milestone 2)

| Phase | Status | Scope |
| ----- | ------ | ----- |
| **2.0** | Complete | Routing follow-ups, region landmarks, studio URL guards, session id registry |
| **2.1** | Complete | `types.ts`, `constants/music.ts`, `project/createProject.ts` factories |
| **2.2** | Complete | `storage/storage.ts`, `migrate.ts`, `validate.ts`, `StorageResult` I/O |
| **2.3** | Complete | Vitest for validate, migrate, create, duplicate; load warnings (no auto-write) |
| **2.4** | Complete | Hub load/create/save/open; store-backed route validation |
| **2.5** | Complete | Rename, duplicate, delete (confirm dialog); full hub CRUD |
| **2.6** | Complete | Recovery UX, loading states, sample-preview documented as dev shortcut |
| **M3+** | Not started | Studio sequencer UI, explicit save, audio |

Do **not** add files from later phases until that phase starts (see [Milestone boundaries](#milestone-boundaries)).

---

## Design principles (stable)

1. **URL is the router** — Hub vs Studio via `useAppSubRoute("music-creator")`; never hand-roll `pushState` without preserving shell query params.
2. **React state in the app tree** — No app-local Zustand. Hub/Studio use component state and props. Tone synth nodes live in a module singleton (M4), never in React state or `localStorage`.
3. **Explicit save in Studio** — Autosave is post-MVP. Studio edits stay in `workingCopy` until Save (M3+). **Hub rename/duplicate/delete save immediately** via `saveStore` (phase 2.5).
4. **Typed storage results** — All persistence I/O returns `StorageResult<T>`; surface errors in UI banners. Do not silently catch like arcade storage.
5. **One envelope, one key** — `localStorage` key `music-creator:store`; shape `MusicCreatorStoreEnvelope`. No separate index/blob keys.
6. **Single tab** — No cross-tab sync; last-write-wins is acceptable for POC. Document, do not over-engineer.

---

## Conventions

### App identity

- **App ID:** `music-creator` (URL segment, manifest id, CSS prefix `music-creator-`)
- **Storage key:** `music-creator:store`
- **Session routing key:** `music-creator:session-project-ids` in `sessionStorage` — fallback for `SAMPLE_PREVIEW_PROJECT_ID` (`constants/storageMessages.ts`) only

### Comments

Prefer readable code first, but **do not hesitate to comment** when you or a future reader might ask “why?” — especially while learning the app.

**Especially comment:**

- **Router and hub** (`MusicCreatorContent`, `ProjectHub`) — state variables, render branches, who owns persistence vs presentation
- **Timing / ordering** (e.g. `storeReady` before route guard, load does not rewrite disk)
- **Multi-step flows** (create → save → navigate; repair vs reset)
- **Intentional limitations** (sample-preview not persisted, shell leave without confirm)

**Usually skip:**

- Pure boilerplate JSX, obvious prop passthrough, restating what a line literally does

**Style:** `//` for inline “why”; `/** … */` on exported helpers; a short block comment above each major hub state or render section is welcome.

**Recovery UX note:** Quota/corrupt-storage UI is defensive POC wiring — unlikely in normal use (see plan). Manual verify via DevTools when touching storage; no need to re-test every session.

### Routing

- Always `useAppSubRoute("music-creator")` for `navigate` / `replace` / segments.
- Bare `/music-creator` → `replace("projects")`.
- `/music-creator/studio` (no id) → `replace("projects")`.
- Unknown studio id → `replace("projects")` + one-shot “Project not found” banner.
- **Route lookup (2.4+):** `isKnownProjectId(id, envelope)` checks `localStorage` first; session registry for sample-preview dev shortcut only.

### Left nav

- Use shell **`nav-item` / `nav-item-icon` / `nav-item-label`** for every entry (including studio context). Custom nav blocks break collapsed mode — shell hides labels via `.shell[data-nav="collapsed"] .nav-item-label`.
- Add `title` when collapsed for icon-only tooltips. Match Arcade / shell patterns, not a separate card-style context block.

### CSS

- Design tokens only (`--color-*`, `--space-*`, `--text-*`, `--radius-*`).
- Classes prefixed `music-creator-`.
- Styles in `music-creator.css`; import via `src/styles.css`.

### Icons

- Inline SVG in components (no emoji, no icon font libraries).

### Accessibility

- Shell owns document `<main className="shell">` — app views use `<div role="region" aria-labelledby="...">`, not nested `<main>`.
- `type="button"` on non-submit controls; visible `:focus-visible` (`.music-creator-btn`).
- M3+: sequencer cells are native `<button type="button">` with `aria-label` and `aria-pressed` — not ARIA grid/roving tabindex.

### State ownership (MVP)

| Concern | Owner |
| ------- | ----- |
| Project list, storage errors | Hub React state |
| `workingCopy`, `isDirty`, transport UI | Studio React state |
| URL route | `useAppSubRoute` |
| Persisted projects | `localStorage` envelope via `storage/` |
| Tone nodes, schedule ids | `audioEngine` module (M4) |

---

## File organization

| What | Where |
| ---- | ----- |
| Types, envelope, `StorageResult` | `types.ts` |
| STEPS, drum ids, melody MIDI, tempo bounds | `constants/music.ts` (or `constants/index.ts`) |
| Storage error copy, sample-preview id | `constants/storageMessages.ts` |
| Blank project / empty store factories | `project/createProject.ts` |
| Hub list sort / date display | `project/sortProjects.ts`, `project/formatProject.ts` |
| Duplicate, rename helpers | `project/projectUtils.ts` |
| Hub project row + dialogs | `components/ProjectCard.tsx`, `ConfirmDeleteDialog.tsx`, `ConfirmResetStorageDialog.tsx` |
| Recovery / loading UI | `components/StorageRecoveryPanel.tsx`, `LoadWarningsBanner.tsx`, `LoadingPanel.tsx` |
| Load, save, migrate, validate | `storage/*.ts` |
| Pure helper tests | Colocated `**/*.test.ts` (phase 2.3+) |
| Studio URL guards (interim) | `routing/projectRoute.ts` |
| Router | `MusicCreatorContent.tsx` |
| Hub / Studio views | `views/` |
| Shared UI | `components/` (when milestone needs them) |
| Audio | `audio/` (M4 only) |

Add folders in the milestone that needs them — do not pre-create empty `storage/`, `audio/`, or `components/` trees.

---

## Data model quick reference

- **`MusicProject`** — one saved composition (drums, melody, tempo, mutes, metadata).
- **`MusicCreatorStoreEnvelope`** — wrapper stored in `localStorage`: `{ schemaVersion, projects: Record<id, MusicProject> }`. “Envelope” means outer document shape, not ADSR.
- **`StorageResult<T>`** — `{ ok: true, data }` or `{ ok: false, code, message }`; callers branch on `ok` for banners and recovery UI.
- **Factories** — use `createEmptyProject(id)` / `createEmptyStoreEnvelope()` from `project/createProject.ts`; do not hand-build default objects in components.

### Persistence I/O (phase 2.2+)

All reads/writes go through `storage/storage.ts`:

| API | Purpose |
| --- | ------- |
| `loadStore()` | Parse → migrate → validate projects; returns `LoadedStore` with warnings; **does not rewrite disk** on load |
| `saveStore(envelope)` | Full envelope replace under `music-creator:store` |
| `resetStore()` | Save empty envelope (recovery) |
| `isProjectInStore(envelope, id)` | Route guard helper (wired in 2.4) |

Never throw from storage into React render. Never silently catch write failures.

---

## Milestone boundaries

**Do not add before the listed phase:**

| Phase | Do not add yet |
| ----- | -------------- |
| Before 3.x | Sequencer components, `TransportBar`, Studio Save/dirty |
| Before 4.x | `tone` dependency, `audio/` |
| MVP | App-local Zustand, command bus, `headerItems`, autosave, `Transport.cancel()` |

(Milestone 2 phase gates removed — M2 is complete.)

---

## Dev workflow

- Run `npm run check` after substantive changes; run `npm test` once phase 2.3 tests exist.
- **HMR** usually picks up edits to existing files. After **adding new files/folders**, config changes, or deps: restart `npm run dev` if behavior looks stale.
- If the browser shows old behavior: hard refresh (Ctrl+Shift+R), confirm dev server port in the terminal, search loaded sources for a string you recently added (e.g. `isKnownProjectId`).
- One git commit per **milestone** (not per internal phase) unless the user asks otherwise.

---

## Verification checklists

Tick when manually verified. **Milestone 2** is complete — keep one sign-off block plus edge-case recipes below; per-phase 2.x lists are retired (history lives in git / plan).

### Milestone 2 — sign-off

Core flows (hub CRUD, routing, persistence, recovery):

- [x] Routing: redirects, studio deep links, unknown id banner, shell `?nav=` preserved, no nested app `<main>`
- [x] Persistence: create/open/rename/duplicate/delete survive refresh
- [x] Storage errors surfaced in UI (no white screen); reset + invalid-project repair work
- [x] Sample studio (dev) opens without being in store
- [x] `npm run check` and `npm test` (music-creator) pass

**Loading UI:** `LoadingPanel` renders while `storeReady` is false (sync `loadStore` in `useEffect` — usually sub-frame, so you may never see the spinner; that is expected). Client-side hub → studio navigation skips loading because the store is already in memory.

#### Edge-case recipes (run when touching storage code)

**Save failure** — stub `localStorage.setItem` for key `music-creator:store` to throw `QuotaExceededError`, then try New project / Duplicate. Expect error banner; stay on hub. Restore with `localStorage.setItem = Storage.prototype.setItem`.

**Corrupt JSON** — set `music-creator:store` to `{not json`, reload → recovery panel → Reset storage → empty hub.

**Invalid project on disk** — add `"bad-id": { "name": "broken" }` inside `projects`, reload → warning banner → valid cards still shown → **Remove invalid from storage** → `bad-id` gone from disk.

### Studio (M3+) — add when implemented

- [ ] Explicit Save writes `localStorage`; dirty indicator; leave confirm on app-controlled navigation

### Audio (M4+) — add when implemented

- [ ] `dispose()` on Studio unmount; no `Transport.cancel()` in codebase

---

## Common mistakes

1. Hand-rolling `pushState` without preserving shell query params — use `useAppSubRoute`.
2. Adding persistence, audio, or empty component folders before their milestone phase.
3. Hard-coded colors instead of `--color-*` tokens.
4. Nested `<main>` inside Hub or Studio — use `role="region"`.
5. Throwing from storage parse into React render — return `StorageResult` and show banners.
6. Auto-deleting bad projects from `localStorage` on load — exclude from UI and warn; repair only on explicit user action.
7. Putting Tone synths or Transport event ids in React state or `localStorage`.
8. Assuming HMR applied new files — restart dev server when behavior diverges from source.
9. Custom left-nav studio blocks instead of shell `nav-item` — breaks collapsed icon-only layout and font consistency.

---

## Testing

- **Pure helpers** (validate, migrate, factories, schedule): Vitest colocated `*.test.ts` starting phase 2.3.
- **UI / routing:** manual checklist above; no `@vitest/browser` unless repo adds it.
- **CI:** `npm run check` always; `npm test` when app tests exist.
