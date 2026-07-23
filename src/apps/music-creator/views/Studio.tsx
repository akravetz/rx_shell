interface StudioProps {
  projectId: string;
  onBackToProjects: () => void;
}

/**
 * Unified music workspace (sequencer UI and audio in later milestones).
 */
export function Studio({ projectId, onBackToProjects }: StudioProps) {
  return (
    <main className="music-creator-page music-creator-studio" aria-labelledby="music-creator-studio-heading">
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
              Studio
            </h1>
          </div>
          <p className="music-creator-muted">
            Project ID: <code className="music-creator-code">{projectId}</code>
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
            Drum grid, melody grid, and transport will land in upcoming milestones. This view
            confirms deep-linking to{" "}
            <code className="music-creator-code">/music-creator/studio/{projectId}</code>.
          </p>
        </section>
      </div>
    </main>
  );
}
