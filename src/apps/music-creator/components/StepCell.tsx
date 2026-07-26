export interface StepCellProps {
  /** Whether this step is active (hit / note on) */
  isActive: boolean;
  /** Full accessible name, e.g. "Kick, step 5, on" */
  ariaLabel: string;
  onToggle: () => void;
}

/**
 * One sequencer step — native button (not ARIA grid) per plan M3 a11y.
 * Space on a focused cell activates via browser default; no document-level handler.
 */
export function StepCell({ isActive, ariaLabel, onToggle }: StepCellProps) {
  return (
    <button
      type="button"
      className={
        isActive
          ? "music-creator-step-cell music-creator-step-cell--active"
          : "music-creator-step-cell"
      }
      aria-label={ariaLabel}
      aria-pressed={isActive}
      onClick={onToggle}
    />
  );
}
