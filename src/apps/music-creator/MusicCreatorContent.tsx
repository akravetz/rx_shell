import { useEffect } from "react";
import { useAppSubRoute } from "../../shell/useAppSubRoute";
import { ProjectHub } from "./views/ProjectHub";
import { Studio } from "./views/Studio";

const APP_ID = "music-creator";

/**
 * Main router: Project Hub vs Studio workspace.
 * URL-driven via useAppSubRoute (preserves shell query params).
 */
export function MusicCreatorContent() {
  const { segments, replace, navigate } = useAppSubRoute(APP_ID);

  const section = segments[0] ?? "";

  useEffect(() => {
    if (segments.length === 0) {
      replace("projects");
    }
  }, [segments.length, replace]);

  if (section === "" || section === "projects") {
    return (
      <ProjectHub
        onOpenStudio={(projectId) => navigate(`studio/${projectId}`)}
      />
    );
  }

  if (section === "studio") {
    const projectId = segments[1] ?? "";
    if (!projectId) {
      return (
        <ProjectHub
          onOpenStudio={(id) => navigate(`studio/${id}`)}
        />
      );
    }
    return (
      <Studio
        projectId={projectId}
        onBackToProjects={() => navigate("projects")}
      />
    );
  }

  return (
    <div className="music-creator-page">
      <div className="music-creator-panel music-creator-panel--center">
        <h1 className="music-creator-title">Unknown route</h1>
        <p className="music-creator-muted">
          This path is not recognized. Return to the project hub to continue.
        </p>
        <button
          type="button"
          className="music-creator-btn music-creator-btn-primary"
          onClick={() => navigate("projects")}
        >
          Go to projects
        </button>
      </div>
    </div>
  );
}
