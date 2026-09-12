# Market Access — Plans

Local-first AIShell app for Global Market Access research: human-in-the-loop, evidence-oriented **assessments** for one pharmaceutical product/asset at a time. The first workflow is an **AnalogAssessment**. Generated claims should remain traceable to supporting sources.

## PR sequence

1. **PR 1 — UI foundation** (complete — [`pr-01-ui-foundation.md`](pr-01-ui-foundation.md))
2. **PR 2 — local assessment creation and persistence** (active — [`pr-02-local-persistence.md`](pr-02-local-persistence.md); host-visible directories with `sources/` and `knowledge/`, Markdown/DOCX/PPTX copy)
3. **PR 3 —** documentation-only CodaScope research, architecture proposal / first ADR, and progressive-disclosure documentation
4. Later implementation scope follows the accepted ADR

Do not create `pr-03-…md` or reorganize docs in this PR. Do not design later implementation PRs until the ADR is accepted.

## What to read

**Normally read only the active PR plan.** For current behavior, read [`ARCHITECTURE.md`](../ARCHITECTURE.md) and [`AGENTS.md`](../AGENTS.md). Completed plans are historical design records.

| Plan | Status |
| --- | --- |
| [`pr-01-ui-foundation.md`](pr-01-ui-foundation.md) | **Complete / historical** — UI foundation |
| [`pr-02-local-persistence.md`](pr-02-local-persistence.md) | **Active** — host-visible local persistence (`sources/` + `knowledge/`, MD/DOCX/PPTX) |

Completed plans stay as historical design records. They are not mandatory context for later work.

Future plans should reference durable architecture in [`ARCHITECTURE.md`](../ARCHITECTURE.md) rather than repeating earlier plans.

Cursor-managed `.cursor/plans/` files, if present, are tooling state only. **This directory is canonical.**
