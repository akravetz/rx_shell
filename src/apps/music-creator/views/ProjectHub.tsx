interface ProjectHubProps {
  onOpenStudio: (projectId: string) => void;
}

/**
 * Project Hub — create/open entry point (persistence in Milestone 2).
 */
export function ProjectHub({ onOpenStudio }: ProjectHubProps) {
  const handleNewProject = () => {
    const id = crypto.randomUUID();
    onOpenStudio(id);
  };

  const handleOpenSample = () => {
    onOpenStudio("sample-preview");
  };

  return (
    <main className="music-creator-page music-creator-hub" aria-labelledby="music-creator-hub-heading">
      <div className="music-creator-hub-inner">
        <header className="music-creator-hub-header">
          <h1 id="music-creator-hub-heading" className="music-creator-title">
            Music Creator
          </h1>
          <p className="music-creator-subtitle">
            Create short loops with a drum sequencer and a simple melody grid.
          </p>
        </header>

        <div className="music-creator-hub-actions">
          <button
            type="button"
            className="music-creator-btn music-creator-btn-primary"
            onClick={handleNewProject}
          >
            New blank project
          </button>
          <button
            type="button"
            className="music-creator-btn music-creator-btn-secondary"
            onClick={handleOpenSample}
          >
            Open sample studio
          </button>
        </div>

        <section
          className="music-creator-empty"
          aria-labelledby="music-creator-empty-heading"
        >
          <div className="music-creator-empty-icon" aria-hidden>
            <EmptyProjectsIcon />
          </div>
          <h2 id="music-creator-empty-heading" className="music-creator-empty-title">
            No saved projects yet
          </h2>
          <p className="music-creator-muted">
            Project storage arrives in the next milestone. Use the buttons above to open the
            studio and verify navigation and URLs.
          </p>
        </section>
      </div>
    </main>
  );
}

function EmptyProjectsIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
