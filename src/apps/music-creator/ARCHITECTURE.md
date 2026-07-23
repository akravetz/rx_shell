# Music Creator — Application Architecture

> **Progressive Disclosure Document** — Start reading from the top. Stop when you have enough context.

---

## Level 0 — What Is This?

Music Creator is a **browser-based miniature music tool** hosted in AIShell. Users manage projects on a **Project Hub** and compose in a single **Studio** view (drum sequencer + melody grid + transport). Audio uses Tone.js starting in Milestone 4; projects persist in `localStorage` starting in Milestone 2.

---

## Level 1 — File Map (Milestone 1)

```
src/apps/music-creator/
├── manifest.tsx              # AppManifest — id music-creator
├── music-creator.css         # Namespaced .music-creator-*
├── ARCHITECTURE.md           # This file
├── AGENTS.md                 # Dev conventions
├── MusicCreatorContent.tsx   # Sub-route router (hub vs studio)
├── MusicCreatorNav.tsx       # Left nav — Projects + studio context
└── views/
    ├── ProjectHub.tsx        # Home / project management (placeholder list)
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

---

## Level 3+ — Planned (not yet implemented)

- Milestone 2: `localStorage` index and project documents
- Milestone 3: Sequencer UI, transport bar, autosave
- Milestone 4: Tone.js audio engine and playhead
- Milestone 5: Command bus, extended polish

See the approved implementation plan in the repo planning docs for full schema and engine design.
