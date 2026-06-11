import { Play, Pause, X, Minimize2 } from 'lucide-react';

type FocusModeProps = {
  timerDisplay: string;
  pursuit: string;
  isRunning: boolean;
  actionLoading: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onExit: () => void;
};

export function FocusMode({
  timerDisplay,
  pursuit,
  isRunning,
  actionLoading,
  onPause,
  onResume,
  onCancel,
  onExit,
}: FocusModeProps) {
  return (
    <div className="focus-overlay" role="dialog" aria-label="Focus mode">
      <button
        type="button"
        className="focus-overlay-exit"
        onClick={onExit}
        aria-label="Exit focus mode"
      >
        <Minimize2 size={20} />
        <span>Exit Focus</span>
      </button>

      <div className="focus-overlay-content">
        <span className="focus-overlay-pursuit">{pursuit}</span>

        <div className="focus-overlay-timer" aria-live="polite">
          {timerDisplay}
        </div>

        <div className="focus-overlay-status">
          {isRunning ? 'FOCUSING' : 'PAUSED'}
        </div>

        <div className="focus-overlay-actions">
          {isRunning ? (
            <button
              type="button"
              className="focus-overlay-action-btn"
              onClick={onPause}
              disabled={actionLoading}
            >
              <Pause size={24} fill="currentColor" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              type="button"
              className="focus-overlay-action-btn"
              onClick={onResume}
              disabled={actionLoading}
            >
              <Play size={24} fill="currentColor" />
              <span>Resume</span>
            </button>
          )}

          <button
            type="button"
            className="focus-overlay-cancel-btn"
            onClick={onCancel}
            disabled={actionLoading}
          >
            <X size={20} />
            <span>End Session</span>
          </button>
        </div>
      </div>
    </div>
  );
}
