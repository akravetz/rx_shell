import { MELODY_NOTE_LABELS, MELODY_SCALE_MIDI, STEPS } from "../constants";
import type { MelodyPattern } from "../types";
import { MuteToggle } from "./MuteToggle";
import { StepCell } from "./StepCell";

export interface MelodyGridProps {
  /** 16-step monophonic line — MIDI note or null per step from workingCopy.melody */
  pattern: MelodyPattern;
  /** workingCopy.mutes.melody — true silences melody at playback (M4) */
  isMelodyMuted: boolean;
  onToggleNote: (rowIndex: number, stepIndex: number) => void;
  onToggleMelodyMute: () => void;
}

/** Screen-reader label: "G4, step 5, on" (steps are 1-based in copy) */
function melodyStepAriaLabel(rowIndex: number, stepIndex: number, isActive: boolean): string {
  const pitch = MELODY_NOTE_LABELS[rowIndex];
  const stepNumber = stepIndex + 1;
  return `${pitch}, step ${stepNumber}, ${isActive ? "on" : "off"}`;
}

/**
 * Eight-row × 16-step melody grid (C major octave). Monophonic: at most one row lit
 * per column — toggling a cell sets that pitch for the step or clears it if already active.
 * Studio owns workingCopy.melody and dirty state via onToggleNote.
 */
export function MelodyGrid({
  pattern,
  isMelodyMuted,
  onToggleNote,
  onToggleMelodyMute,
}: MelodyGridProps) {
  const stepIndices = Array.from({ length: STEPS }, (_, index) => index);
  const rowIndices = Array.from({ length: MELODY_SCALE_MIDI.length }, (_, index) => index);
  // Piano-roll style: highest pitch (C5) at top, lowest (C4) at bottom — rowIndex still indexes MELODY_SCALE_MIDI.
  const displayRowIndices = [...rowIndices].reverse();

  return (
    <section
      className="music-creator-melody-sequencer"
      aria-labelledby="music-creator-melody-heading"
    >
      <div className="music-creator-section-header-row">
        <h2 id="music-creator-melody-heading" className="music-creator-section-title">
          Melody
        </h2>
        <MuteToggle
          trackName="Melody"
          isMuted={isMelodyMuted}
          onToggle={onToggleMelodyMute}
        />
      </div>
      <p className="music-creator-muted music-creator-melody-hint">
        One note per step — click a pitch to set it; click again to rest. A new pitch in the
        same column replaces the previous note.
      </p>

      <div
        className={
          isMelodyMuted
            ? "music-creator-melody-grid music-creator-melody-grid--muted"
            : "music-creator-melody-grid"
        }
        role="group"
        aria-label="Melody pattern, 8 pitches by 16 steps"
      >
        <div className="music-creator-melody-grid-row music-creator-sequencer-grid-row music-creator-sequencer-grid-row--header">
          {/* Spacer — same label-column width as drum rows so step columns align */}
          <span aria-hidden="true" />
          {stepIndices.map((stepIndex) => (
            <span
              key={`melody-header-${stepIndex}`}
              className="music-creator-sequencer-step-header"
              aria-hidden="true"
            >
              {stepIndex + 1}
            </span>
          ))}
        </div>

        {displayRowIndices.map((rowIndex) => (
          <div
            key={MELODY_NOTE_LABELS[rowIndex]}
            className="music-creator-melody-grid-row music-creator-sequencer-grid-row"
          >
            <span className="music-creator-melody-pitch-label">{MELODY_NOTE_LABELS[rowIndex]}</span>
            {stepIndices.map((stepIndex) => {
              const midiNote = MELODY_SCALE_MIDI[rowIndex];
              const isActive = pattern[stepIndex] === midiNote;
              return (
                <StepCell
                  key={`${rowIndex}-${stepIndex}`}
                  isActive={isActive}
                  ariaLabel={melodyStepAriaLabel(rowIndex, stepIndex, isActive)}
                  onToggle={() => onToggleNote(rowIndex, stepIndex)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
