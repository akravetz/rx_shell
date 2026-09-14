import { IconAssessments } from "../components/MarketAccessIcons";
import { packageFormatLabel } from "../packageFile";
import type { Assessment } from "../types";

interface AssessmentListProps {
  assessments: Assessment[];
  skippedCount: number;
  listStatus: "loading" | "ready" | "error";
  listError: string | null;
  flashMessage: string | null;
  onDismissFlash: () => void;
  onRetry: () => void;
  onCreate: () => void;
  onOpen: (assessmentId: string) => void;
}

function skippedBannerText(count: number): string {
  if (count === 1) {
    return "One saved assessment could not be loaded.";
  }
  return `${count} saved assessments could not be loaded.`;
}

/** Assessments hub — persisted cards, empty state, or load error. */
export function AssessmentList({
  assessments,
  skippedCount,
  listStatus,
  listError,
  flashMessage,
  onDismissFlash,
  onRetry,
  onCreate,
  onOpen,
}: AssessmentListProps) {
  const sorted = [...assessments].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const hasAssessments = sorted.length > 0;
  // First visit only: do not replace existing cards with a spinner/error
  // if a later Retry fails while we still have a cached list.
  const showInitialLoading = listStatus === "loading" && !hasAssessments;
  const showInitialError = listStatus === "error" && !hasAssessments;

  return (
    <div
      className="market-access-page"
      role="region"
      aria-labelledby="market-access-list-heading"
    >
      {flashMessage ? (
        <div className="market-access-banner" role="status">
          <p className="market-access-banner-text">{flashMessage}</p>
          <button
            type="button"
            className="market-access-btn market-access-btn-ghost"
            onClick={onDismissFlash}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {listError && hasAssessments ? (
        <div className="market-access-banner market-access-banner-error" role="alert">
          <p className="market-access-banner-text">{listError}</p>
          <button
            type="button"
            className="market-access-btn market-access-btn-ghost"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      ) : null}

      {skippedCount > 0 ? (
        <div className="market-access-banner" role="status">
          <p className="market-access-banner-text">
            {skippedBannerText(skippedCount)}
          </p>
        </div>
      ) : null}

      <header className="market-access-list-header">
        <h1 id="market-access-list-heading" className="market-access-title">
          Assessments
        </h1>
        <p className="market-access-session-note">
          Assessments are saved on this computer and remain after you refresh
          or reopen the app.
        </p>
      </header>

      <div className="market-access-actions">
        <button
          type="button"
          className="market-access-btn market-access-btn-primary"
          onClick={onCreate}
        >
          Create assessment
        </button>
      </div>

      {showInitialLoading ? (
        <p className="market-access-status" aria-live="polite">
          Loading assessments…
        </p>
      ) : null}

      {showInitialError ? (
        <section
          className="market-access-empty"
          aria-labelledby="market-access-list-error-heading"
        >
          <h2
            id="market-access-list-error-heading"
            className="market-access-empty-title"
          >
            Could not load assessments
          </h2>
          <p className="market-access-form-error" role="alert">
            {listError ?? "Could not load assessments."}
          </p>
          <button
            type="button"
            className="market-access-btn market-access-btn-primary"
            onClick={onRetry}
          >
            Retry
          </button>
        </section>
      ) : null}

      {!showInitialLoading && !showInitialError && hasAssessments ? (
        <section aria-labelledby="market-access-assessment-list-heading">
          <h2
            id="market-access-assessment-list-heading"
            className="market-access-section-title"
          >
            Your assessments
          </h2>
          <ul className="market-access-assessment-list">
            {sorted.map((assessment) => (
              <li key={assessment.id}>
                <article className="market-access-assessment-card">
                  <button
                    type="button"
                    className="market-access-assessment-card-open"
                    onClick={() => onOpen(assessment.id)}
                  >
                    <span className="market-access-assessment-card-name">
                      {assessment.productName}
                    </span>
                    <span className="market-access-assessment-card-meta">
                      {assessment.packageFile.fileName} ·{" "}
                      {packageFormatLabel(assessment.packageFile.format)}
                    </span>
                  </button>
                </article>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!showInitialLoading && !showInitialError && !hasAssessments ? (
        <section
          className="market-access-empty"
          aria-labelledby="market-access-empty-heading"
        >
          <div className="market-access-empty-icon" aria-hidden>
            <IconAssessments size={48} />
          </div>
          <h2 id="market-access-empty-heading" className="market-access-empty-title">
            No assessments yet
          </h2>
          <p className="market-access-empty-text">
            Create an assessment for one product or asset. Attach a Markdown,
            Word, or PowerPoint package to research pharmaceutical analogs.
          </p>
        </section>
      ) : null}
    </div>
  );
}
