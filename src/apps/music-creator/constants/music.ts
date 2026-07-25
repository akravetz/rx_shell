import type { DrumTrackId } from "../types";

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

/** C major octave — row order for the 8-row melody grid (C4–C5) */
export const MELODY_SCALE_MIDI: readonly number[] = [60, 62, 64, 65, 67, 69, 71, 72];

export const MUTE_TARGET_IDS = [...DRUM_TRACK_IDS, "melody"] as const;
