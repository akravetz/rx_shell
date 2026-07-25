import { SAMPLE_PREVIEW_PROJECT_ID } from "../constants/storageMessages";

export interface StudioProps {
  projectId: string;
  projectName?: string;
  projectTempo?: number;
  onBackToProjects: () => void;
}

/**
 * Unified music workspace (sequencer UI and audio in later milestones).
 */
export function Studio({
  projectId,
  projectName,
  projectTempo,
  onBackToProjects,
}: StudioProps) {
  const displayName = projectName ?? "Untitled";
  // sample-preview uses session registry only — no row in localStorage, so no projectName prop.
  const isSamplePreview =
    projectId === SAMPLE_PREVIEW_PROJECT_ID && !projectName;

  return (
    <div
      className="music-creator-page music-creator-studio"
      role="region"
      aria-labelledby="music-creator-studio-heading"
    >
      <div className="music-creator-studio-inner">
        <header className="music-creator-studio-header">
          <div className="music-creator-studio-header-row">
            <button
              type="button"
              className="music-creator-btn music-creator-btn-ghost"
              onClick={onBackToProjects}
            >
              All projects
            </button>
            <h1 id="music-creator-studio-heading" className="music-creator-title music-creator-title-sm">
              {displayName}
            </h1>
          </div>
          <p className="music-creator-muted">
            {isSamplePreview ? (
              <>
                Sample preview — not saved to storage. Project ID:{" "}
                <code className="music-creator-code">{projectId}</code>
              </>
            ) : (
              <>
                {projectTempo !== undefined ? `${projectTempo} BPM · ` : null}
                Project ID: <code className="music-creator-code">{projectId}</code>
              </>
            )}
          </p>
        </header>

        <section
          className="music-creator-studio-placeholder"
          aria-labelledby="music-creator-studio-placeholder-heading"
        >
          <h2 id="music-creator-studio-placeholder-heading" className="music-creator-empty-title">
            Sequencer coming soon
          </h2>
          <p className="music-creator-muted">
            Drum grid, melody grid, and transport will land in upcoming milestones.
            {isSamplePreview
              ? " This sample route confirms deep-linking without persistence."
              : " Saved projects open here from the hub."}
          </p>
        </section>
      </div>
    </div>
  );
}
