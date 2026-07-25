import type { MusicProject } from "../types";

export interface ProjectMutationOptions {
  now?: string;
}

/** Deep-clone a project under a new id with `" (copy)"` name suffix */
export function duplicateProject(
  source: MusicProject,
  newId: string,
  options: ProjectMutationOptions = {},
): MusicProject {
  const now = options.now ?? new Date().toISOString();

  return {
    id: newId,
    name: `${source.name} (copy)`,
    tempo: source.tempo,
    drums: structuredClone(source.drums),
    melody: [...source.melody], // primitives/null — slice copy is enough
    mutes: { ...source.mutes },
    createdAt: now,
    updatedAt: now,
  };
}

/** Return a copy with an updated display name and fresh updatedAt */
export function renameProject(
  project: MusicProject,
  name: string,
  options: ProjectMutationOptions = {},
): MusicProject {
  const now = options.now ?? new Date().toISOString();

  return {
    ...project,
    name,
    updatedAt: now,
  };
}
