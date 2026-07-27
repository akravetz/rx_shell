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

## Current progress

| Phase | Status | Scope |
| ----- | ------ | ----- |
| **M2** | Complete | Persistence, hub CRUD, recovery UX, Vitest |
| **M3** | Complete | Studio sequencer UI (silent), explicit Save, leave guard |
| **4.1** | Complete | `tone` dep; `audio/drumSynths.ts`, `audio/melodySynth.ts` |
| **4.2** | Complete | `audio/schedulePattern.ts` + `buildSchedule` Vitest |
| **4.3** | Complete | `audio/audioEngine.ts` — load, play, stop, dispose, setTempo |
| **4.4** | Complete | Studio Play/Stop toggle, playhead, live BPM, live pattern edits |
| **4.5** | **Complete** | `dispose()` on Studio unmount / project change |
| **M4** | **Complete** | Tone.js playback — ready for M5 QA |
| **M5** | Not started | QA audit, optional polish |

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
- **Studio** (`workingCopy`, dirty/Save, leave guard) — what lives in React vs disk
- **Audio** (`audio/*`) — factories vs engine ownership; `stop()` keeps synths, `dispose()` destroys them; never in React state
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
| Hub project row + dialogs | `components/ProjectCard.tsx`, `components/ConfirmDeleteDialog.tsx` |
| Studio transport toolbar | `components/TransportBar.tsx` (M3 phase 3.1+) |
| Sequencer cells + drum grid | `components/StepCell.tsx`, `components/DrumSequencer.tsx` (M3 phase 3.2+) |
| Melody grid | `components/MelodyGrid.tsx` (M3 phase 3.3+) |
| Per-track mute control | `components/MuteToggle.tsx` (M3 phase 3.4+) |
| Studio leave confirm | `components/ConfirmLeaveStudioDialog.tsx`, `routing/leaveGuard.ts` (M3 phase 3.5) |
| Studio Save helper | `project/projectUtils.ts` → `commitStudioProject` |
| Storage load / recovery UI | `components/storage/` — `LoadingPanel`, `LoadWarningsBanner`, `StorageRecoveryPanel`, `ConfirmResetStorageDialog` |
| Load, save, migrate, validate | `storage/*.ts` |
| Pure helper tests | Colocated `**/*.test.ts` (phase 2.3+) |
| Studio URL guards (interim) | `routing/projectRoute.ts` |
| Studio dirty leave guard | `routing/leaveGuard.ts` |
| Drum / melody synth factories | `audio/drumSynths.ts`, `audio/melodySynth.ts` (M4 phase 4.1) |
| Pure playback schedule | `audio/schedulePattern.ts` → `buildSchedule` (M4 phase 4.2) |
| Playback engine singleton | `audio/audioEngine.ts` (M4 phase 4.3) |
| Router | `MusicCreatorContent.tsx` |
| Hub / Studio views | `views/` |
| Shared UI | `components/` |
| Audio engine | `audio/audioEngine.ts` (4.3+) |

Add modules in the phase that needs them — do not pre-create empty trees or later-phase files early.

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
| Before 4.5 | `dispose()` on Studio unmount / project id change |
| MVP | App-local Zustand, command bus, `headerItems`, autosave, `Transport.cancel()` |

(Milestone 4 complete.)

---

## Dev workflow

- Run `npm run check` after substantive changes; run `npm test` once phase 2.3 tests exist.
- **HMR** usually picks up edits to existing files. After **adding new files/folders**, config changes, or deps: restart `npm run dev` if behavior looks stale.
- If the browser shows old behavior: hard refresh (Ctrl+Shift+R), confirm dev server port in the terminal, search loaded sources for a string you recently added (e.g. `isKnownProjectId`).
- One git commit per **milestone** (not per internal phase) unless the user asks otherwise.

---

## Verification checklists

Tick when **you** have manually verified (agents leave these unchecked — do not pre-tick). **Milestone 2** is complete — keep one sign-off block plus edge-case recipes below; per-phase 2.x lists are retired (history lives in git / plan).

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

### Milestone 3 — sign-off

Studio sequencer UI (silent) — per-phase 3.x lists retired (history in git / plan).

- [x] Transport: name/tempo editors; Play/Stop disabled; dirty indicator; sample-preview Save disabled
- [x] Drums 4×16 + melody 8×16 (monophonic); native button cells with `aria-pressed` / focus ring
- [x] Per-track mute toggles; pattern stays editable while muted; mute → dirty
- [x] Explicit Save writes pattern/name/tempo/mutes; refresh restores; dirty clears; Save failure keeps dirty + banner
- [x] Leave confirm on **All projects** / nav **Projects** when dirty; Stay keeps edits; Leave discards
- [x] Clean project navigates without confirm; browser Back / refresh / shell Home: no custom confirm
- [x] `npm run check` and `npm test` (music-creator) pass

**Stretch (post-MVP):** `beforeunload` when dirty — generic browser prompt on refresh/tab close only.

#### Studio save failure (DevTools)

1. Open Studio on a saved project; make an edit so **Save** enables.
2. DevTools → **Console**:
   ```js
   const key = "music-creator:store";
   const orig = localStorage.setItem.bind(localStorage);
   localStorage.setItem = function (k, v) {
     if (k === key) throw new DOMException("QuotaExceededError", "QuotaExceededError");
     return orig(k, v);
   };
   ```
3. Click **Save** → red error banner in Studio; project stays **Unsaved changes**; pattern still in the grid.
4. Restore: `localStorage.setItem = orig` (re-run bind from step 2 if needed) or hard refresh.

### Audio (M4) — phase 4.1

- [x] `tone` in `package.json` / lockfile; Play/Stop still disabled in Studio
- [x] `audio/drumSynths.ts` and `audio/melodySynth.ts` exist (no audible path yet — optional skim)

### Audio (M4) — phase 4.2

- [x] `npm run check` and `npm test` (music-creator) pass — includes `buildSchedule` tests

### Audio (M4) — phase 4.3

- [x] `audio/audioEngine.ts` exports `load`, `play`, `stop`, `dispose`, `setTempo`, `isPlaying`
- [x] Play/Stop still disabled in Studio (audible test waits for 4.4)
- [x] `npm run check` and `npm test` (music-creator) pass
- [x] Grep: no `Transport.cancel()` in app code (only docs/comments)

### Audio (M4) — phase 4.4

- [x] Open Studio — paint pattern; **Play** toggle starts audio; toggle again **Stop**
- [x] Playhead column + bar dividers every 4 steps visible while playing
- [x] Edit grid/mutes while playing — hear changes on upcoming steps
- [x] Tempo slider works live during playback
- [x] Hi-hat lane labels wrap (not truncated)

### Milestone 4 — sign-off (4.5)

- [x] Leave Studio (All projects, browser back, another app) — audio stops immediately
- [x] Switch studio project URL — no leaked audio from previous project
- [x] Stop then Play reuses synths (no full navigation required)
- [x] Kick/snare/open-hat distinguishable; kick level acceptable
- [x] `npm run check` and `npm test` (music-creator) pass
- [x] No `Transport.cancel()` in app code

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
10. Expecting shell-level or browser Back leave confirm — only **All projects** and nav **Projects** use `routing/leaveGuard`; refresh guard is stretch (`beforeunload`).

---

## Testing

- **Pure helpers** (validate, migrate, factories, schedule): Vitest colocated `*.test.ts` starting phase 2.3.
- **UI / routing:** manual checklist above; no `@vitest/browser` unless repo adds it.
- **CI:** `npm run check` always; `npm test` when app tests exist.
