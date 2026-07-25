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
├── components/               # Hub UI (M2)
│   ├── ProjectCard.tsx
│   ├── ConfirmDeleteDialog.tsx
│   ├── ConfirmResetStorageDialog.tsx
│   ├── StorageRecoveryPanel.tsx
│   ├── LoadWarningsBanner.tsx
│   └── LoadingPanel.tsx
├── storage/                  # load/save/validate/migrate (M2 phase 2.2)
│   ├── storage.ts
│   ├── migrate.ts
│   ├── validate.ts
│   └── *.test.ts             # Vitest (M2 phase 2.3)
├── routing/
│   └── projectRoute.ts       # Session registry + store-backed id lookup (M2)
├── ARCHITECTURE.md           # This file
├── AGENTS.md                 # Dev conventions
├── MusicCreatorContent.tsx   # Router + store owner (load, CRUD, recovery)
├── MusicCreatorNav.tsx       # Left nav — Projects + studio context
└── views/
    ├── ProjectHub.tsx        # Hub layout + state orchestration
    └── Studio.tsx            # Unified workspace (placeholder)
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

## Level 9+ — Planned (Milestone 3+)

- Milestone 3: Sequencer UI, transport bar, explicit Studio save
- Milestone 4: Tone.js audio engine and playhead
- Milestone 5: QA audit, optional polish

See the approved implementation plan in the repo planning docs for full schema and engine design.
