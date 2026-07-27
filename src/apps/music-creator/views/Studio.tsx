import { useCallback, useEffect, useRef, useState } from "react";
import { audioEngine } from "../audio/audioEngine";
import { ConfirmLeaveStudioDialog } from "../components/ConfirmLeaveStudioDialog";
import { DrumSequencer } from "../components/DrumSequencer";
import { MelodyGrid } from "../components/MelodyGrid";
import { TransportBar } from "../components/TransportBar";
import { DEFAULT_PROJECT_NAME, MELODY_SCALE_MIDI, TEMPO_MAX, TEMPO_MIN } from "../constants";
import { SAMPLE_PREVIEW_PROJECT_ID } from "../constants/storageMessages";
import { createEmptyProject } from "../project/createProject";
import { registerStudioLeaveGuard, tryLeaveStudio } from "../routing/leaveGuard";
import type { DrumTrackId, MusicProject, MuteTargetId } from "../types";

export type StudioSaveResult =
  | { ok: true }
  | { ok: false; message: string };

export interface StudioProps {
  projectId: string;
  /** Persisted project from the store — omitted for dev sample-preview route */
  savedProject?: MusicProject;
  /** Writes workingCopy to localStorage; router refreshes savedProject on success */
  onSaveProject: (project: MusicProject) => StudioSaveResult;
  onBackToProjects: () => void;
}

/**
 * Unified music workspace.
 *
 * Router passes `savedProject` when the URL id exists in localStorage.
 * Edits live in `workingCopy` until Save (explicit — hub rename still saves immediately).
 *
 * Playback (M4): Studio owns `isPlaying` / `currentStep` React state; `audioEngine`
 * owns Tone nodes and Transport schedule. Pattern/mute edits during playback call
 * `audioEngine.updatePattern` so the grid stays audible while playing.
 */
export function Studio({
  projectId,
  savedProject,
  onSaveProject,
  onBackToProjects,
}: StudioProps) {
  const isSamplePreview = projectId === SAMPLE_PREVIEW_PROJECT_ID && savedProject === undefined;

  // workingCopy: editable in-memory project — cloned from disk on mount / id change
  const [workingCopy, setWorkingCopy] = useState<MusicProject>(() =>
    resolveInitialWorkingCopy(projectId, savedProject),
  );
  // isDirty: workingCopy differs from last successful Save / load snapshot
  const [isDirty, setIsDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  // Playback UI — engine callbacks update these; synths stay in audioEngine module
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);

  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  /** Ignores engine onStep(0) fired during stop — playhead hides when not playing */
  const playbackActiveRef = useRef(false);

  // When parent refreshes store after Save (or project id changes), sync from disk.
  useEffect(() => {
    setWorkingCopy(resolveInitialWorkingCopy(projectId, savedProject));
    setIsDirty(false);
    setSaveError(null);
  }, [projectId, savedProject]);

  // Full teardown when switching projects (4.5)
  useEffect(() => {
    playbackActiveRef.current = false;
    audioEngine.dispose();
    setIsPlaying(false);
    setCurrentStep(null);
  }, [projectId]);

  // Leaving Studio (hub, browser back, another app) — silence audio and free synths
  useEffect(() => {
    return () => {
      audioEngine.dispose();
    };
  }, []);

  // Live pattern — push grid/mute edits to the engine while Transport runs
  useEffect(() => {
    if (!isPlaying) return;
    audioEngine.updatePattern({
      drums: workingCopy.drums,
      melody: workingCopy.melody,
      mutes: workingCopy.mutes,
    });
  }, [isPlaying, workingCopy.drums, workingCopy.melody, workingCopy.mutes]);

  const markDirty = useCallback((updater: (prev: MusicProject) => MusicProject) => {
    setWorkingCopy((prev) => updater(prev));
    setIsDirty(true);
    setSaveError(null);
  }, []);

  const handleNameChange = useCallback(
    (name: string) => {
      markDirty((prev) => ({ ...prev, name }));
    },
    [markDirty],
  );

  const handleTempoChange = useCallback(
    (tempo: number) => {
      const clamped = Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, tempo));
      markDirty((prev) => ({ ...prev, tempo: clamped }));
      // Live BPM — Transport schedule stays; only step rate changes (M4)
      if (isPlayingRef.current) {
        audioEngine.setTempo(clamped);
      }
    },
    [markDirty],
  );

  /**
   * Start playback from the current workingCopy. Pattern edits while playing
   * flow through updatePattern (see effect above).
   */
  const handlePlay = useCallback(async () => {
    playbackActiveRef.current = true;
    setIsPlaying(true);

    try {
      const snapshot = structuredClone(workingCopy);
      await audioEngine.play(snapshot, {
        onStep: (stepIndex) => {
          if (playbackActiveRef.current) {
            setCurrentStep(stepIndex);
          }
        },
      });
    } catch {
      playbackActiveRef.current = false;
      setIsPlaying(false);
      setCurrentStep(null);
    }
  }, [workingCopy]);

  const handleStop = useCallback(() => {
    playbackActiveRef.current = false;
    audioEngine.stop();
    setIsPlaying(false);
    setCurrentStep(null);
  }, []);

  const handleTogglePlayback = useCallback(() => {
    if (isPlayingRef.current) {
      handleStop();
      return;
    }
    void handlePlay();
  }, [handlePlay, handleStop]);

  /** Toggle one drum cell — clones the lane array so React sees an immutable update */
  const handleDrumToggle = useCallback(
    (trackId: DrumTrackId, stepIndex: number) => {
      markDirty((prev) => {
        const lane = [...prev.drums[trackId]];
        lane[stepIndex] = !lane[stepIndex];
        return {
          ...prev,
          drums: {
            ...prev.drums,
            [trackId]: lane,
          },
        };
      });
    },
    [markDirty],
  );

  /**
   * Monophonic melody toggle — workingCopy.melody[step] holds one MIDI note or null.
   * Clicking the active pitch in a column clears it; clicking another pitch replaces it.
   */
  const handleMelodyToggle = useCallback(
    (rowIndex: number, stepIndex: number) => {
      markDirty((prev) => {
        const melody = [...prev.melody];
        const note = MELODY_SCALE_MIDI[rowIndex];
        melody[stepIndex] = melody[stepIndex] === note ? null : note;
        return { ...prev, melody };
      });
    },
    [markDirty],
  );

  /** Flip one entry in workingCopy.mutes — persisted on Save */
  const handleMuteToggle = useCallback(
    (targetId: MuteTargetId) => {
      markDirty((prev) => ({
        ...prev,
        mutes: {
          ...prev.mutes,
          [targetId]: !prev.mutes[targetId],
        },
      }));
    },
    [markDirty],
  );

  const handleSave = useCallback(() => {
    if (isSamplePreview) return;

    const trimmed = workingCopy.name.trim();
    if (!trimmed) {
      setSaveError("Project name cannot be empty.");
      return;
    }

    const result = onSaveProject(workingCopy);
    if (!result.ok) {
      setSaveError(result.message);
      return;
    }

    setSaveError(null);
    // isDirty clears when parent refreshStore updates savedProject prop
  }, [isSamplePreview, onSaveProject, workingCopy]);

  const handleBackToProjects = useCallback(() => {
    tryLeaveStudio(onBackToProjects);
  }, [onBackToProjects]);

  // Register leave guard for left nav (separate manifest region from this tree).
  useEffect(() => {
    registerStudioLeaveGuard({
      getIsDirty: () => isDirtyRef.current,
      confirmLeave: (proceed) => setPendingLeave(() => proceed),
    });
    return () => registerStudioLeaveGuard(null);
  }, []);

  const displayName = workingCopy.name.trim() || DEFAULT_PROJECT_NAME;

  return (
    <div
      className="music-creator-page music-creator-studio"
      role="region"
      aria-labelledby="music-creator-studio-heading"
    >
      <div className="music-creator-studio-inner">
        <header className="music-creator-studio-header">
          <div className="music-creator-studio-header-row">
            <button
              type="button"
              className="music-creator-btn music-creator-btn-ghost"
              onClick={handleBackToProjects}
            >
              All projects
            </button>
            <h1 id="music-creator-studio-heading" className="music-creator-title music-creator-title-sm">
              {displayName}
            </h1>
          </div>
          <p className="music-creator-muted">
            {isSamplePreview ? (
              <>
                Sample preview — not saved to storage. Project ID:{" "}
                <code className="music-creator-code">{projectId}</code>
              </>
            ) : (
              <>
                Project ID: <code className="music-creator-code">{projectId}</code>
              </>
            )}
          </p>
        </header>

        {saveError ? (
          <div className="music-creator-banner music-creator-banner--error" role="alert">
            <p className="music-creator-banner-text">{saveError}</p>
            <button
              type="button"
              className="music-creator-btn music-creator-btn-ghost music-creator-banner-dismiss"
              onClick={() => setSaveError(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <TransportBar
          name={workingCopy.name}
          tempo={workingCopy.tempo}
          isDirty={isDirty}
          isPlaying={isPlaying}
          onNameChange={handleNameChange}
          onTempoChange={handleTempoChange}
          onTogglePlayback={handleTogglePlayback}
          onSave={handleSave}
          saveDisabled={isSamplePreview}
        />

        <div className="music-creator-sequencer-stack">
          <DrumSequencer
            pattern={workingCopy.drums}
            mutes={workingCopy.mutes}
            currentStep={currentStep}
            onToggleStep={handleDrumToggle}
            onToggleMute={(trackId) => handleMuteToggle(trackId)}
          />

          <MelodyGrid
            pattern={workingCopy.melody}
            isMelodyMuted={workingCopy.mutes.melody}
            currentStep={currentStep}
            onToggleNote={handleMelodyToggle}
            onToggleMelodyMute={() => handleMuteToggle("melody")}
          />
        </div>
      </div>

      {pendingLeave ? (
        <ConfirmLeaveStudioDialog
          onStay={() => setPendingLeave(null)}
          onLeaveWithoutSaving={() => {
            const proceed = pendingLeave;
            setPendingLeave(null);
            proceed();
          }}
        />
      ) : null}
    </div>
  );
}

/** Resolve the initial working copy from the saved project or create an empty project. */
function resolveInitialWorkingCopy(
  projectId: string,
  savedProject: MusicProject | undefined,
): MusicProject {
  if (savedProject) {
    // structuredClone keeps nested drum/melody arrays independent of store snapshot
    return structuredClone(savedProject);
  }

  return createEmptyProject(projectId, {
    name: projectId === SAMPLE_PREVIEW_PROJECT_ID ? "Sample preview" : DEFAULT_PROJECT_NAME,
  });
}
