import { TEMPO_MAX, TEMPO_MIN } from "../constants";

export interface TransportBarProps {
  name: string;
  tempo: number;
  /** True when workingCopy differs from last saved state — drives Save affordance */
  isDirty: boolean;
  onNameChange: (name: string) => void;
  onTempoChange: (tempo: number) => void;
  /** Wired by Studio — persists workingCopy via router saveStore (phase 3.5) */
  onSave: () => void;
  /** When true, Save does nothing useful yet (3.1) or storage is unavailable */
  saveDisabled?: boolean;
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 2.5v11l9-5.5-9-5.5z" fill="currentColor" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3" y="3" width="10" height="10" rx="1" fill="currentColor" />
    </svg>
  );
}

/**
 * Studio transport toolbar — playback chrome lands in M4; phase 3.1 ships
 * name/tempo editors, explicit Save, and a dirty indicator without audio.
 */
export function TransportBar({
  name,
  tempo,
  isDirty,
  onNameChange,
  onTempoChange,
  onSave,
  saveDisabled = false,
}: TransportBarProps) {
  const tempoInputId = "music-creator-transport-tempo";
  const nameInputId = "music-creator-transport-name";

  return (
    <div
      className="music-creator-transport"
      role="toolbar"
      aria-label="Transport and project settings"
    >
      <div className="music-creator-transport-playback" aria-label="Playback">
        <button
          type="button"
          className="music-creator-btn music-creator-btn-secondary music-creator-transport-btn"
          disabled
          aria-label="Play (available in a later milestone)"
        >
          <PlayIcon />
          <span className="music-creator-transport-btn-label">Play</span>
        </button>
        <button
          type="button"
          className="music-creator-btn music-creator-btn-secondary music-creator-transport-btn"
          disabled
          aria-label="Stop (available in a later milestone)"
        >
          <StopIcon />
          <span className="music-creator-transport-btn-label">Stop</span>
        </button>
      </div>

      <div className="music-creator-transport-fields">
        <div className="music-creator-transport-field">
          <label className="music-creator-transport-label" htmlFor={nameInputId}>
            Project name
          </label>
          <input
            id={nameInputId}
            type="text"
            className="music-creator-input music-creator-transport-name-input"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="music-creator-transport-field music-creator-transport-tempo-field">
          <label className="music-creator-transport-label" htmlFor={tempoInputId}>
            Tempo ({TEMPO_MIN}–{TEMPO_MAX} BPM)
          </label>
          <div className="music-creator-transport-tempo-row">
            <input
              id={tempoInputId}
              type="range"
              className="music-creator-transport-tempo-slider"
              min={TEMPO_MIN}
              max={TEMPO_MAX}
              step={1}
              value={tempo}
              onChange={(event) => onTempoChange(Number(event.target.value))}
              aria-valuemin={TEMPO_MIN}
              aria-valuemax={TEMPO_MAX}
              aria-valuenow={tempo}
              aria-valuetext={`${tempo} beats per minute`}
            />
            <output
              className="music-creator-transport-tempo-value"
              htmlFor={tempoInputId}
            >
              {tempo} BPM
            </output>
          </div>
        </div>
      </div>

      <div className="music-creator-transport-save">
        <span
          className="music-creator-transport-dirty"
          aria-live="polite"
          aria-atomic="true"
        >
          {isDirty ? "Unsaved changes" : "Saved"}
        </span>
        <button
          type="button"
          className="music-creator-btn music-creator-btn-primary"
          onClick={onSave}
          disabled={saveDisabled || !isDirty}
          aria-label={isDirty ? "Save project" : "Save project (no changes)"}
        >
          Save
        </button>
      </div>
    </div>
  );
}
