import type { DrumTrackId, MuteTargetId } from "../types";

/** Sequencer and schema defaults — used by factories, validation, and (later) Studio grids */

export const STEPS = 16;

export const DEFAULT_TEMPO = 120;
export const DEFAULT_PROJECT_NAME = "Untitled";
export const TEMPO_MIN = 60;
export const TEMPO_MAX = 180;

export const DRUM_TRACK_IDS: readonly DrumTrackId[] = [
  "kick",
  "snare",
  "hatClosed",
  "hatOpen",
] as const;

/** Human-readable lane names for grid labels and StepCell aria-labels */
export const DRUM_TRACK_LABELS: Record<DrumTrackId, string> = {
  kick: "Kick",
  snare: "Snare",
  hatClosed: "Closed hi-hat",
  hatOpen: "Open hi-hat",
};

/** C major octave — row order for the 8-row melody grid (C4–C5) */
export const MELODY_SCALE_MIDI: readonly number[] = [60, 62, 64, 65, 67, 69, 71, 72];

/** Row labels aligned with MELODY_SCALE_MIDI indices — used by MelodyGrid UI and aria-labels */
export const MELODY_NOTE_LABELS: readonly string[] = [
  "C4",
  "D4",
  "E4",
  "F4",
  "G4",
  "A4",
  "B4",
  "C5",
];

export const MUTE_TARGET_IDS = [...DRUM_TRACK_IDS, "melody"] as const;

/** Display names for mute toggles — drums reuse lane labels; melody is separate */
export const MUTE_TARGET_LABELS: Record<MuteTargetId, string> = {
  kick: DRUM_TRACK_LABELS.kick,
  snare: DRUM_TRACK_LABELS.snare,
  hatClosed: DRUM_TRACK_LABELS.hatClosed,
  hatOpen: DRUM_TRACK_LABELS.hatOpen,
  melody: "Melody",
};
