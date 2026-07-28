export interface StepCellProps {
  /** Whether this step is active (hit / note on) */
  isActive: boolean;
  /** Current transport step column — playhead highlight while playing (M4) */
  isPlayhead?: boolean;
  /** Right border after steps 3, 7, 11 — 4-bar visual grouping (not after the last column) */
  isBarEnd?: boolean;
  /** Full accessible name, e.g. "Kick, step 5, on" */
  ariaLabel: string;
  onToggle: () => void;
}

/**
 * One sequencer step — native button (not ARIA grid) per plan M3 a11y.
 * Space on a focused cell activates via browser default; no document-level handler.
 */
export function StepCell({
  isActive,
  isPlayhead = false,
  isBarEnd = false,
  ariaLabel,
  onToggle,
}: StepCellProps) {
  const classNames = ["music-creator-step-cell"];
  if (isActive) classNames.push("music-creator-step-cell--active");
  if (isPlayhead) classNames.push("music-creator-step-cell--playhead");
  if (isBarEnd) classNames.push("music-creator-step-cell--bar-end");

  return (
    <button
      type="button"
      className={classNames.join(" ")}
      aria-label={ariaLabel}
      aria-pressed={isActive}
      onClick={onToggle}
    />
  );
}
