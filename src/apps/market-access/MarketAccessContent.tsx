import { useCallback, useEffect, useState } from "react";
import { useAppSubRoute } from "../../shell/useAppSubRoute";
import {
  AssessmentApiError,
  createAssessment,
  getAssessment,
  listAssessments,
} from "./assessmentApi";
import type { Assessment, CreateAssessmentInput } from "./types";
import { AssessmentList } from "./views/AssessmentList";
import { AssessmentWorkspace } from "./views/AssessmentWorkspace";
import { CreateAssessment } from "./views/CreateAssessment";

const APP_ID = "market-access";
const NOT_FOUND_FLASH = "Assessment not found.";

/** Insert if new, replace if the id is already in the cache. */
function upsertAssessment(list: Assessment[], item: Assessment): Assessment[] {
  const index = list.findIndex((entry) => entry.id === item.id);
  if (index === -1) return [item, ...list];
  return list.map((entry) => (entry.id === item.id ? item : entry));
}

function isMissingAssessment(err: unknown): boolean {
  return (
    err instanceof AssessmentApiError &&
    (err.code === "not_found" || err.code === "invalid_id")
  );
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof AssessmentApiError ? err.message : fallback;
}

function WorkspaceLoadState({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div
        className="market-access-page"
        role="region"
        aria-labelledby="market-access-workspace-heading"
      >
        <h1 id="market-access-workspace-heading" className="market-access-title">
          Assessment
        </h1>
        <p className="market-access-form-error" role="alert">
          {error}
        </p>
        <div className="market-access-actions">
          <button
            type="button"
            className="market-access-btn market-access-btn-primary"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="market-access-page"
      role="region"
      aria-labelledby="market-access-workspace-heading"
      aria-busy="true"
    >
      <h1 id="market-access-workspace-heading" className="market-access-title">
        Assessment
      </h1>
      <p className="market-access-status" aria-live="polite">
        Loading assessment…
      </p>
    </div>
  );
}

/**
 * URL router + list cache.
 *
 * Disk via `/api/market-access/*` is the source of truth. `assessments`
 * is only a working copy so the list and workspace can render without
 * refetching on every click. After POST we upsert, then navigate — that
 * is why All assessments can show the new card before another GET.
 */
export function MarketAccessContent() {
  const { segments, subPath, navigate, replace } = useAppSubRoute(APP_ID);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [listStatus, setListStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [workspaceStatus, setWorkspaceStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  // Bumping this re-runs the workspace GET (Retry) without changing the URL.
  const [workspaceRetry, setWorkspaceRetry] = useState(0);

  const section = segments[0] ?? "";
  const id = segments[1] ?? "";
  const isListRoute = section === "" || (section === "assessments" && !id);
  const isCreateRoute = section === "assessments" && id === "new";
  const isWorkspaceRoute =
    section === "assessments" && Boolean(id) && id !== "new";
  const cachedAssessment =
    isWorkspaceRoute
      ? (assessments.find((item) => item.id === id) ?? null)
      : null;

  const refreshList = useCallback(async () => {
    setListStatus("loading");
    try {
      const data = await listAssessments();
      setAssessments(data.assessments);
      setSkippedCount(data.skippedCount);
      setListError(null);
      setListStatus("ready");
    } catch (err) {
      setListError(errorMessage(err, "Could not load assessments."));
      setListStatus("error");
    }
  }, []);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  // Canonicalize URLs only — unknown :id is decided by the workspace GET.
  useEffect(() => {
    const parts = subPath.split("/").filter(Boolean);

    if (parts.length === 0) {
      replace("assessments");
      return;
    }

    if (parts[0] !== "assessments") {
      setFlashMessage("That page is not available.");
      replace("assessments");
      return;
    }

    if (parts.length > 2) {
      const assessmentId = parts[1];
      if (assessmentId && assessmentId !== "new") {
        replace(`assessments/${assessmentId}`);
        return;
      }
      setFlashMessage("That page is not available.");
      replace("assessments");
    }
  }, [subPath, replace]);

  // Refresh / paste-link: fetch one assessment. Card click skips this
  // because the row is already in the cache. `cancelled` ignores a
  // response if the user navigates away mid-request.
  useEffect(() => {
    if (!isWorkspaceRoute || !id) {
      setWorkspaceStatus("idle");
      setWorkspaceError(null);
      return;
    }
    if (cachedAssessment) {
      setWorkspaceStatus("idle");
      setWorkspaceError(null);
      return;
    }

    let cancelled = false;
    setWorkspaceStatus("loading");
    setWorkspaceError(null);

    void getAssessment(id)
      .then((assessment) => {
        if (cancelled) return;
        setAssessments((prev) => upsertAssessment(prev, assessment));
        setWorkspaceStatus("idle");
      })
      .catch((err) => {
        if (cancelled) return;
        if (isMissingAssessment(err)) {
          setFlashMessage(NOT_FOUND_FLASH);
          replace("assessments");
          setWorkspaceStatus("idle");
          return;
        }
        setWorkspaceError(errorMessage(err, "Could not load the assessment."));
        setWorkspaceStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [cachedAssessment, id, isWorkspaceRoute, replace, workspaceRetry]);

  const handleCreate = useCallback(
    async (input: CreateAssessmentInput) => {
      const assessment = await createAssessment(input);
      setAssessments((prev) => upsertAssessment(prev, assessment));
      setFlashMessage(null);
      navigate(`assessments/${assessment.id}`);
    },
    [navigate],
  );

  const listView = (
    <AssessmentList
      assessments={assessments}
      skippedCount={skippedCount}
      listStatus={listStatus}
      listError={listError}
      flashMessage={flashMessage}
      onDismissFlash={() => setFlashMessage(null)}
      onRetry={() => {
        void refreshList();
      }}
      onCreate={() => {
        setFlashMessage(null);
        navigate("assessments/new");
      }}
      onOpen={(assessmentId) => {
        setFlashMessage(null);
        navigate(`assessments/${assessmentId}`);
      }}
    />
  );

  if (isListRoute) {
    return listView;
  }

  if (isCreateRoute) {
    return (
      <CreateAssessment
        onCancel={() => {
          setFlashMessage(null);
          navigate("assessments");
        }}
        onCreate={handleCreate}
      />
    );
  }

  if (isWorkspaceRoute && cachedAssessment) {
    return <AssessmentWorkspace assessment={cachedAssessment} />;
  }

  if (isWorkspaceRoute) {
    return (
      <WorkspaceLoadState
        error={
          workspaceStatus === "error"
            ? (workspaceError ?? "Could not load the assessment.")
            : null
        }
        onRetry={() => setWorkspaceRetry((count) => count + 1)}
      />
    );
  }

  return listView;
}
