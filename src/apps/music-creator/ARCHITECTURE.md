# Music Creator — Application Architecture

> **Progressive Disclosure Document** — Start reading from the top. Stop when you have enough context.

---

## Level 0 — What Is This?

Music Creator is a **browser-based miniature music tool** hosted in AIShell. Users manage projects on a **Project Hub** and compose in a single **Studio** view (drum sequencer + melody grid + transport). Audio uses Tone.js starting in Milestone 4; projects persist in `localStorage` starting in Milestone 2.

---

## Level 1 — File Map

```
src/apps/music-creator/
├── manifest.tsx              # AppManifest — id music-creator
├── music-creator.css         # Namespaced .music-creator-*
├── types.ts                  # MusicProject, envelope, StorageResult (M2)
├── constants/
│   ├── music.ts              # STEPS, tempo, drum ids, melody scale
│   ├── storageMessages.ts    # StorageErrorCode user copy, sample-preview id
│   └── index.ts              # Re-exports for convenient imports
├── project/
│   ├── createProject.ts      # Blank project + empty store factories (M2)
│   ├── projectUtils.ts       # duplicate, rename helpers (M2 phase 2.3)
│   ├── sortProjects.ts       # Hub list ordering (M2 phase 2.4)
│   └── formatProject.ts      # updatedAt display for cards (M2 phase 2.5)
├── components/
│   ├── ProjectCard.tsx
│   ├── ConfirmDeleteDialog.tsx
│   ├── TransportBar.tsx      # Studio toolbar (M3 phase 3.1)
│   ├── StepCell.tsx          # Sequencer button cell (M3 phase 3.2)
│   ├── DrumSequencer.tsx     # 4×16 drum grid (M3 phase 3.2)
│   ├── MelodyGrid.tsx        # 8×16 monophonic melody (M3 phase 3.3)
│   ├── MuteToggle.tsx        # Per-track mute button (M3 phase 3.4)
│   ├── ConfirmLeaveStudioDialog.tsx  # Unsaved leave confirm (M3 phase 3.5)
│   └── storage/              # Load/recovery UI (pairs with storage/ module)
│       ├── ConfirmResetStorageDialog.tsx
│       ├── StorageRecoveryPanel.tsx
│       ├── LoadWarningsBanner.tsx
│       └── LoadingPanel.tsx
├── storage/                  # load/save/validate/migrate (M2 phase 2.2)
│   ├── storage.ts
│   ├── migrate.ts
│   ├── validate.ts
│   └── *.test.ts             # Vitest (M2 phase 2.3)
├── routing/
│   ├── projectRoute.ts       # Session registry + store-backed id lookup (M2)
│   └── leaveGuard.ts         # Dirty leave confirm for app-controlled routes (M3 phase 3.5)
├── ARCHITECTURE.md           # This file
├── AGENTS.md                 # Dev conventions
├── MusicCreatorContent.tsx   # Router + store owner (load, CRUD, recovery)
├── MusicCreatorNav.tsx       # Left nav — Projects + studio context
└── views/
    ├── ProjectHub.tsx        # Hub layout + state orchestration
    └── Studio.tsx            # Unified workspace — workingCopy + transport (M3)
```

---

## Level 2 — Routing

Navigation uses `useAppSubRoute("music-creator")` from the shell.

| URL | View |
|-----|------|
| `/music-creator` | Redirects to `/music-creator/projects` |
| `/music-creator/projects` | Project Hub |
| `/music-creator/studio/:projectId` | Studio |

Shell query params (`?rp=`, `?nav=`, etc.) are preserved by the hook.

**Dev shortcut:** `SAMPLE_PREVIEW_PROJECT_ID` (`sample-preview`) opens Studio via session registry only — not persisted. Kept intentionally for deep-link QA (phase 2.6).

---

## Level 3 — Data model (M2 phase 2.1)

Types and factories in `types.ts`, `constants/music.ts`, `project/createProject.ts`.

New projects default to name `"Untitled"`, tempo 120, empty drums, melody all rests, all tracks unmuted.

---

## Level 4 — Persistence I/O (M2 phase 2.2)

Single key `music-creator:store`. Module: `storage/`.

| File | Role |
| ---- | ---- |
| `storage/storage.ts` | `loadStore`, `saveStore`, `resetStore` — all return `StorageResult` |
| `storage/migrate.ts` | Schema version migration (v1 only today) |
| `storage/validate.ts` | Envelope + per-project validation; invalid projects become warnings, not throws |

Load excludes bad projects from the returned envelope but **does not auto-repair disk**.

---

## Level 5 — Pure helper tests (M2 phase 2.3)

Colocated Vitest under `project/*.test.ts` and `storage/*.test.ts` covers validate, migrate, factories, `duplicateProject`, and `loadStore` warning behavior (invalid projects omitted from the returned envelope; disk not auto-repaired on load).

---

## Level 6 — Hub persistence (M2 phase 2.4)

`MusicCreatorContent` loads the store on mount and owns create/save/navigation for new projects.

| Flow | Behavior |
| ---- | -------- |
| Hub mount | `loadStore()` → project list sorted by `updatedAt` desc |
| New project | `createEmptyProject` → `saveStore` → navigate studio |
| Open project | Click list item → navigate studio |
| Route guard | Waits for store load; `isKnownProjectId(id, envelope)` then session fallback |
| Studio | Shows saved name/tempo |

---

## Level 7 — Hub CRUD (M2 phase 2.5)

Full project management on the hub. All mutations go through `MusicCreatorContent.persistEnvelope` → `saveStore`.

| Action | UI | Persistence |
| ------ | -- | ----------- |
| Rename | Inline input on `ProjectCard`; Enter/blur commits | `renameProject()` → immediate `saveStore` |
| Duplicate | Button on card; stays on hub | `duplicateProject()` with new uuid → `saveStore` |
| Delete | `ConfirmDeleteDialog`; Escape/backdrop cancels | Remove key from envelope → `saveStore` |

Hub rename is **immediate save** — separate from Studio explicit Save (M3).

---

## Level 8 — Hub recovery & states (M2 phase 2.6) — **Milestone 2 complete**

| Hub state | UI |
| --------- | -- |
| Loading | `LoadingPanel` while `!storeReady` (first mount / full reload only; sync load is too fast to see in normal use) |
| Fatal load error | `StorageRecoveryPanel` + `ConfirmResetStorageDialog` → `resetStore()` |
| Valid + warnings | `LoadWarningsBanner` → **Remove invalid from storage** → `saveStore(validated envelope)` |
| Empty | Empty-state panel when no valid projects |
| Populated | Sorted `ProjectCard` list |

Studio shows `LoadingPanel` until store is ready on refresh/deep link.

**Repair rule:** Invalid projects are never silently deleted on load. User must explicitly repair (save validated subset) or reset (wipe all).

---

## Level 9 — Studio transport shell (M3 phase 3.1)

Studio loads the URL project into **`workingCopy`** (React state) via `structuredClone` of the saved `MusicProject`. Edits stay in memory until explicit Save (wired in phase 3.5).

| State | Owner | Notes |
| ----- | ----- | ----- |
| `workingCopy` | Studio | Clone of store project on mount / id change |
| `isDirty` | Studio | Set on name/tempo/drum/melody/mute edit; cleared on Save (later) |
| Persisted project | `localStorage` | Unchanged until Save |

`TransportBar`: disabled Play/Stop (M4), name input, tempo range, Save button, dirty indicator (`Saved` / `Unsaved changes`). Sample-preview route uses an in-memory blank project; Save stays disabled.

---

## Level 10 — Drum sequencer (M3 phase 3.2)

| Component | Role |
| --------- | ---- |
| `StepCell` | Native `<button type="button">` per step — `aria-label`, `aria-pressed`, `:focus-visible` |
| `DrumSequencer` | 4 lanes × 16 steps; reads `workingCopy.drums`, calls `onToggleStep(trackId, stepIndex)` |

Toggling a cell flips `workingCopy.drums[trackId][stepIndex]` and sets `isDirty`. Lane display names live in `constants/music.ts` (`DRUM_TRACK_LABELS`).

---

## Level 11 — Melody grid (M3 phase 3.3)

| Component | Role |
| --------- | ---- |
| `MelodyGrid` | 8 pitch rows × 16 steps; reads `workingCopy.melody`, calls `onToggleNote(rowIndex, stepIndex)` |

**Monophonic rule:** `melody[stepIndex]` is one MIDI number or `null`. Clicking a cell sets that pitch for the step; clicking the lit cell again clears it; choosing another row in the same column replaces the note. Row order and MIDI values: `MELODY_SCALE_MIDI` / `MELODY_NOTE_LABELS` in `constants/music.ts`. The grid renders **high pitches at the top** (piano-roll style). Drum and melody grids share flexible step columns (`minmax(step-min, 1fr)`) and the same label width on two full-width grids inside `.music-creator-sequencer-stack`, so step columns align and grow on wide viewports without breakpoint rules. Reuses `StepCell` from the drum grid.

---

## Level 12 — Track mutes (M3 phase 3.4)

| Piece | Role |
| ----- | ---- |
| `MuteToggle` | Native `M` button — `aria-pressed` when muted; label names the track |
| `DrumSequencer` | One mute per drum lane in the label column |
| `MelodyGrid` | Melody mute beside section title |
| `Studio.handleMuteToggle` | Flips `workingCopy.mutes[targetId]` and sets `isDirty` |

**Semantics:** `mutes[id] === true` means silenced at playback (wired in M4 `buildSchedule`). Grids stay editable while muted. Mute state persists on Studio Save. Display names: `MUTE_TARGET_LABELS` in `constants/music.ts`.

---

## Level 13 — Explicit Save and leave confirm (M3 phase 3.5) — **Milestone 3 complete**

| Piece | Role |
| ----- | ---- |
| `TransportBar` Save | Calls `onSaveProject(workingCopy)` → router `saveStore` |
| `commitStudioProject` | Trim name, clone body, touch `updatedAt` before write |
| `ConfirmLeaveStudioDialog` | Stay / Leave without saving when `isDirty` |
| `routing/leaveGuard.ts` | Studio registers guard; nav **Projects** and **All projects** call `tryLeaveStudio` |

**Save flow:** `MusicCreatorContent.handleSaveStudioProject` merges `workingCopy` into envelope → `saveStore` → `refreshStore` → Studio `savedProject` prop updates → `isDirty` clears.

**Save failure:** Inline error banner in Studio; `workingCopy` retained; remains dirty.

**Leave guard scope:** App-controlled only (**All projects**, left nav **Projects**). **Not** browser Back/Forward, shell Home, other app cards, or refresh (stretch: generic `beforeunload` when dirty — post-MVP).

---

## Level 14+ — Planned (M4+)

- Milestone 4: Tone.js audio engine and playhead
- Milestone 5: QA audit, optional polish

See the approved implementation plan in the repo planning docs for full schema and engine design.
