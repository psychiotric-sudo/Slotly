import { minutesToTime, timeToMinutes, validTime } from "../utils/time";

interface TimePickerProps {
  startTime: string;
  endTime: string;
  onChangeStart: (time: string) => void;
  onChangeEnd: (time: string) => void;
}

const STEP = 15;
const QUICK_DURATIONS = [30, 60, 90, 120, 180];
const DAY_MIN = 0;
const DAY_MAX = 24 * 60 - 1;

function shift(time: string, deltaMinutes: number): string {
  const base = validTime(time) ? timeToMinutes(time) : 0;
  const next = Math.min(DAY_MAX, Math.max(DAY_MIN, base + deltaMinutes));
  return minutesToTime(next);
}

export default function TimePicker({
  startTime,
  endTime,
  onChangeStart,
  onChangeEnd,
}: TimePickerProps) {
  const startMin = validTime(startTime) ? timeToMinutes(startTime) : -1;
  const endMin = validTime(endTime) ? timeToMinutes(endTime) : -1;

  // When the start moves forward past the end, pull the end along so the
  // inputs never become invalid.
  const pickStart = (t: string) => {
    onChangeStart(t);
    const m = timeToMinutes(t);
    if (endMin < m) onChangeEnd(minutesToTime(Math.min(m + 30, DAY_MAX)));
  };

  const setDuration = (minutes: number) => {
    if (startMin < 0) return;
    onChangeEnd(minutesToTime(Math.min(startMin + minutes, DAY_MAX)));
  };

  const nudgeEnd = (delta: number) => {
    if (startMin < 0) return;
    // Never allow the end to drop to/past the start.
    const min = startMin + 15;
    const next = Math.max(min, Math.min(DAY_MAX, (endMin < 0 ? startMin : endMin) + delta));
    onChangeEnd(minutesToTime(next));
  };

  const durationLabel =
    startMin >= 0 && endMin > startMin
      ? `${Math.round((endMin - startMin) / 15) * 15} min`
      : null;

  return (
    <div className="time-picker">
      <div className="field-row time-picker-fields">
        <div className="field">
          <label htmlFor="cm-start">Start *</label>
          <div className="time-stepper">
            <button
              type="button"
              className="stepper-btn"
              onClick={() => pickStart(shift(startTime, -STEP))}
              aria-label="Earlier start"
              tabIndex={-1}
            >
              –
            </button>
            <input
              id="cm-start"
              className="input time-input"
              type="time"
              value={startTime}
              onChange={(e) => pickStart(e.target.value)}
            />
            <button
              type="button"
              className="stepper-btn"
              onClick={() => pickStart(shift(startTime, STEP))}
              aria-label="Later start"
              tabIndex={-1}
            >
              +
            </button>
          </div>
        </div>
        <div className="field">
          <label htmlFor="cm-end">End *</label>
          <div className="time-stepper">
            <button
              type="button"
              className="stepper-btn"
              onClick={() => nudgeEnd(-STEP)}
              aria-label="Earlier end"
              tabIndex={-1}
            >
              –
            </button>
            <input
              id="cm-end"
              className="input time-input"
              type="time"
              value={endTime}
              min={validTime(startTime) ? startTime : undefined}
              onChange={(e) => onChangeEnd(e.target.value)}
            />
            <button
              type="button"
              className="stepper-btn"
              onClick={() => nudgeEnd(STEP)}
              aria-label="Later end"
              tabIndex={-1}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="time-quick">
        <span className="time-quick-label">Quick</span>
        <div className="time-quick-btns" role="group" aria-label="Class duration">
          {QUICK_DURATIONS.map((m) => (
            <button
              key={m}
              type="button"
              className="time-quick-btn"
              disabled={startMin < 0}
              onClick={() => setDuration(m)}
            >
              {m >= 120 ? `${m / 60} h` : `${m} min`}
            </button>
          ))}
        </div>
        {durationLabel && <span className="time-duration">≈ {durationLabel}</span>}
      </div>
    </div>
  );
}
