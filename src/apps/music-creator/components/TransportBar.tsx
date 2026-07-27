import { TEMPO_MAX, TEMPO_MIN } from "../constants";

export interface TransportBarProps {
  name: string;
  tempo: number;
  /** True when workingCopy differs from last saved state — drives Save affordance */
  isDirty: boolean;
  /** Transport running — toggles Play vs Stop icon (M4) */
  isPlaying: boolean;
  onNameChange: (name: string) => void;
  onTempoChange: (tempo: number) => void;
  /** Single transport control — Studio starts or stops audioEngine */
  onTogglePlayback: () => void;
  /** Wired by Studio — persists workingCopy via router saveStore (phase 3.5) */
  onSave: () => void;
  /** When true, Save stays disabled (sample-preview route — not persisted) */
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
 * Studio transport toolbar — one Play/Stop toggle plus name/tempo/Save (M4).
 */
export function TransportBar({
  name,
  tempo,
  isDirty,
  isPlaying,
  onNameChange,
  onTempoChange,
  onTogglePlayback,
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
          aria-label={isPlaying ? "Stop playback" : "Play pattern"}
          onClick={onTogglePlayback}
        >
          {isPlaying ? <StopIcon /> : <PlayIcon />}
          <span className="music-creator-transport-btn-label">{isPlaying ? "Stop" : "Play"}</span>
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
