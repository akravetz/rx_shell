import { useAppSubRoute } from "../../shell/useAppSubRoute";

const APP_ID = "music-creator";

export function MusicCreatorNav() {
  const { segments, navigate } = useAppSubRoute(APP_ID);

  const section = segments[0] ?? "";
  const inStudio = section === "studio";
  const projectId = inStudio ? (segments[1] ?? "") : "";

  return (
    <nav className="music-creator-nav" aria-label="Music Creator">
      <div className="music-creator-nav-content scrollable-y">
        <button
          type="button"
          className={`nav-item${section === "projects" || section === "" ? " active" : ""}`}
          aria-current={section === "projects" || section === "" ? "page" : undefined}
          onClick={() => navigate("projects")}
        >
          <span className="nav-item-icon" aria-hidden>
            <ProjectsIcon />
          </span>
          <span className="nav-item-label">Projects</span>
        </button>

        {inStudio && projectId ? (
          <div className="music-creator-nav-context" aria-live="polite">
            <span className="music-creator-nav-context-label">Studio</span>
            <span className="music-creator-nav-context-id" title={projectId}>
              {projectId.slice(0, 8)}
              {projectId.length > 8 ? "…" : ""}
            </span>
          </div>
        ) : null}
      </div>
    </nav>
  );
}

function ProjectsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}
