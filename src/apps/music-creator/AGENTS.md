# Music Creator — Development Guidelines

Read [`ARCHITECTURE.md`](ARCHITECTURE.md) first for routing and file layout.

Shell-level rules: [APP_DEVELOPMENT_GUIDE.md](../../APP_DEVELOPMENT_GUIDE.md) and [ARCHITECTURE.md](../../ARCHITECTURE.md).

---

## Conventions

- **App ID:** `music-creator` (URL segment and CSS prefix `music-creator-`)
- **Routing:** Always `useAppSubRoute("music-creator")` — never duplicate path parsing unless in tests
- **CSS:** Design tokens only; classes prefixed `music-creator-`
- **Icons:** Inline SVG in components (no emoji in UI)
- **Accessibility:** Landmarks (`main`, `nav`), `aria-labelledby` on sections, `type="button"`, visible `:focus-visible` on controls

---

## Milestone 1 verification

- [ ] `/music-creator` → `/music-creator/projects`
- [ ] New project / sample studio opens `/music-creator/studio/:id`
- [ ] Refresh on studio URL restores Studio
- [ ] Browser back returns to hub
- [ ] Left nav “Projects” highlights on hub
- [ ] `npm run check` passes

---

## Common mistakes

1. Hand-rolling `pushState` without preserving shell query params — use `useAppSubRoute`
2. Adding persistence or audio files before their milestone
3. Hard-coded colors instead of `--color-*` tokens
