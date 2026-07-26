import { DRUM_TRACK_IDS, DRUM_TRACK_LABELS, STEPS } from "../constants";
import type { DrumPattern, DrumTrackId } from "../types";
import { MuteToggle } from "./MuteToggle";
import { StepCell } from "./StepCell";

export interface DrumSequencerProps {
  /** Current drum lanes — 16 booleans per track from workingCopy.drums */
  pattern: DrumPattern;
  /** Per-lane mute flags from workingCopy.mutes (true = muted) */
  mutes: Record<DrumTrackId, boolean>;
  onToggleStep: (trackId: DrumTrackId, stepIndex: number) => void;
  onToggleMute: (trackId: DrumTrackId) => void;
}

/** Build screen-reader label: "Kick, step 5, on" (steps are 1-based in copy) */
function drumStepAriaLabel(trackId: DrumTrackId, stepIndex: number, isActive: boolean): string {
  const lane = DRUM_TRACK_LABELS[trackId];
  const stepNumber = stepIndex + 1;
  return `${lane}, step ${stepNumber}, ${isActive ? "on" : "off"}`;
}

/**
 * Four-lane × 16-step drum grid. Each cell toggles one boolean in workingCopy.drums
 * via the parent — Studio owns persistence and dirty state, not this component.
 */
export function DrumSequencer({ pattern, mutes, onToggleStep, onToggleMute }: DrumSequencerProps) {
  const stepIndices = Array.from({ length: STEPS }, (_, index) => index);

  return (
    <section
      className="music-creator-drum-sequencer"
      aria-labelledby="music-creator-drum-heading"
    >
      <h2 id="music-creator-drum-heading" className="music-creator-section-title">
        Drums
      </h2>

      <div className="music-creator-drum-grid" role="group" aria-label="Drum pattern, 4 lanes by 16 steps">
        {/* Spacer cell — aligns step-number header row with the label column (no styles needed) */}
        <div className="music-creator-drum-grid-row music-creator-sequencer-grid-row music-creator-sequencer-grid-row--header">
          <span aria-hidden="true" />
          {stepIndices.map((stepIndex) => (
            <span
              key={`header-${stepIndex}`}
              className="music-creator-sequencer-step-header"
              aria-hidden="true"
            >
              {stepIndex + 1}
            </span>
          ))}
        </div>

        {DRUM_TRACK_IDS.map((trackId) => {
          const isMuted = mutes[trackId];
          const laneLabel = DRUM_TRACK_LABELS[trackId];
          return (
          <div
            key={trackId}
            className={
              isMuted
                ? "music-creator-drum-grid-row music-creator-sequencer-grid-row music-creator-sequencer-grid-row--muted"
                : "music-creator-drum-grid-row music-creator-sequencer-grid-row"
            }
          >
            <div className="music-creator-drum-track-label-cell">
              <MuteToggle
                trackName={laneLabel}
                isMuted={isMuted}
                onToggle={() => onToggleMute(trackId)}
              />
              <span className="music-creator-drum-track-label">{laneLabel}</span>
            </div>
            {stepIndices.map((stepIndex) => {
              const isActive = pattern[trackId][stepIndex] ?? false;
              return (
                <StepCell
                  key={`${trackId}-${stepIndex}`}
                  isActive={isActive}
                  ariaLabel={drumStepAriaLabel(trackId, stepIndex, isActive)}
                  onToggle={() => onToggleStep(trackId, stepIndex)}
                />
              );
            })}
          </div>
          );
        })}
      </div>
    </section>
  );
}
