import { describe, expect, it } from "vitest";
import { createEmptyProject } from "./createProject";
import { duplicateProject, renameProject, commitStudioProject } from "./projectUtils";

describe("duplicateProject", () => {
  const fixedNow = "2026-07-24T12:00:00.000Z";

  it("assigns a new id and appends (copy) to the name", () => {
    const source = createEmptyProject("source-id", {
      name: "Groove",
      now: "2026-01-01T00:00:00.000Z",
    });

    const copy = duplicateProject(source, "copy-id", { now: fixedNow });

    expect(copy.id).toBe("copy-id");
    expect(copy.name).toBe("Groove (copy)");
    expect(copy.createdAt).toBe(fixedNow);
    expect(copy.updatedAt).toBe(fixedNow);
  });

  it("deep-clones pattern data so edits do not alias the source", () => {
    const source = createEmptyProject("source-id", { now: fixedNow });
    source.drums.kick[0] = true;
    source.melody[3] = 60;
    source.mutes.snare = true;

    const copy = duplicateProject(source, "copy-id", { now: fixedNow });

    copy.drums.kick[0] = false;
    copy.melody[3] = null;
    copy.mutes.snare = false;

    expect(source.drums.kick[0]).toBe(true);
    expect(source.melody[3]).toBe(60);
    expect(source.mutes.snare).toBe(true);
  });
});

describe("renameProject", () => {
  const fixedNow = "2026-07-24T12:00:00.000Z";

  it("updates the name and updatedAt while preserving other fields", () => {
    const project = createEmptyProject("proj-1", {
      name: "Old Name",
      now: "2026-01-01T00:00:00.000Z",
    });

    const renamed = renameProject(project, "New Name", { now: fixedNow });

    expect(renamed.name).toBe("New Name");
    expect(renamed.updatedAt).toBe(fixedNow);
    expect(renamed.id).toBe(project.id);
    expect(renamed.createdAt).toBe(project.createdAt);
    expect(renamed.tempo).toBe(project.tempo);
  });
});

describe("commitStudioProject", () => {
  const fixedNow = "2026-07-24T12:00:00.000Z";

  it("trims name, clones body, and touches updatedAt for Studio Save", () => {
    const project = createEmptyProject("proj-1", {
      name: "  Loop  ",
      now: "2026-01-01T00:00:00.000Z",
    });
    project.drums.kick[0] = true;

    const committed = commitStudioProject(project, { now: fixedNow });

    expect(committed.name).toBe("Loop");
    expect(committed.updatedAt).toBe(fixedNow);
    expect(committed.drums.kick[0]).toBe(true);
    expect(project.name).toBe("  Loop  ");
  });
});
