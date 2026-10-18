import { useState } from "react";
import Modal, { ModalCloseButton } from "./Modal";
import Icon from "./icons";
import { GEMINI_PROMPT, parseGeminiJson, type GeminiParseResult } from "../utils/gemini";
import { GEMINI_URL, openGeminiApp } from "../utils/gcal";
import type { CourseEntry, ScheduleBreak, SlotMinutes } from "../types";

interface GeminiModalProps {
  onImport: (
    courses: CourseEntry[],
    breaks: ScheduleBreak[],
    label: string,
    slotMinutes: SlotMinutes
  ) => void;
  onMerge: (courses: CourseEntry[], breaks: ScheduleBreak[], label: string) => void;
  existingCourseCount: number;
  onClose: () => void;
}

export default function GeminiModal({
  onImport,
  onMerge,
  existingCourseCount,
  onClose,
}: GeminiModalProps) {
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<GeminiParseResult | null>(null);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(GEMINI_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically — select the prompt text and copy it manually.");
    }
  };

  const handleImport = () => {
    setParsing(true);
    setError(null);
    setTimeout(() => {
      try {
        setParsed(parseGeminiJson(output));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not parse that JSON.");
      } finally {
        setParsing(false);
      }
    }, 0);
  };

  const doMerge = () => {
    if (!parsed) return;
    onMerge(parsed.courses, parsed.breaks, "Gemini");
    onClose();
  };

  const doReplace = () => {
    if (!parsed) return;
    onImport(parsed.courses, parsed.breaks, "Gemini", parsed.slotMinutes);
    onClose();
  };

  return (
    <Modal
      role="dialog"
      labelledBy="gemini-title"
      onClose={onClose}
      className={`gemini-modal${parsed ? " gemini-modal--choice" : ""}`}
    >
      <header className="modal-header">
        <h2 id="gemini-title">
          <Icon name="sparkles" size={17} />
          {parsed ? "Import from Gemini" : "Import with Gemini AI"}
        </h2>
        <ModalCloseButton className="icon-btn" aria-label="Close">
          <Icon name="x" />
        </ModalCloseButton>
      </header>

      {parsed ? (
        <div className="modal-body">
          <p>
            Gemini returned <strong>{parsed.courses.length}</strong> class
            {parsed.courses.length === 1 ? "" : "es"}
            {parsed.breaks.length > 0
              ? ` and ${parsed.breaks.length} break${parsed.breaks.length === 1 ? "" : "s"}`
              : ""}
            .
          </p>
          {existingCourseCount > 0 && (
            <p className="settings-hint">
              Your current tab has {existingCourseCount} class
              {existingCourseCount === 1 ? "" : "es"}. Merge adds to them (duplicate
              breaks are skipped); Replace clears the current tab first.
            </p>
          )}
        </div>
      ) : (
      <div className="modal-body">
        <ol className="gemini-steps">
          <li>
            <p>
              Take a photo of your class schedule and{" "}
              <a href={GEMINI_URL} target="_blank" rel="noreferrer">
                upload it to Gemini <Icon name="external" size={13} />
              </a>
              , or open the Gemini app directly.
            </p>
            <button
              type="button"
              className="btn-secondary gemini-open-app"
              onClick={openGeminiApp}
            >
              Open Google Gemini <Icon name="external" size={13} className="btn-trailing" />
            </button>
          </li>
          <li>
            <p>Copy the prompt below, paste it into Gemini, and send it.</p>
            <div className="prompt-box">
              <button
                type="button"
                className={`btn-primary prompt-copy${copied ? " copied" : ""}`}
                onClick={copyPrompt}
              >
                <Icon name={copied ? "check" : "file"} size={14} />
                {copied ? "Copied" : "Copy prompt"}
              </button>
              <pre>{GEMINI_PROMPT}</pre>
            </div>
          </li>
          <li>
            <p>
              Copy the JSON Gemini returns and paste it here, then hit{" "}
              <strong>Import</strong>.
            </p>
            <textarea
              className="input paste-area"
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              placeholder='{"courses":[{"title":"…","code":"…","day":"MON","startTime":"07:30","endTime":"09:00",…}]}'
              rows={6}
            />
          </li>
        </ol>

        {error && <p className="form-error">{error}</p>}

        <details className="schema-hint">
          <summary>What Gemini should output</summary>
          <pre>{`{
  "slotMinutes": 30,
  "courses": [
    {
      "title": "Full course title",
      "code": "Course code (or title)",
      "instructor": "… (optional)",
      "room": "… (optional)",
      "day": "MON | TUE | WED | THU | FRI | SAT | SUN",
      "startTime": "HH:MM",
      "endTime": "HH:MM"
    }
  ],
  "breaks": [
    { "label": "RECESS", "startTime": "09:20", "endTime": "09:40" },
    { "label": "LUNCH BREAK", "startTime": "12:00", "endTime": "13:00" }
  ]
}`}</pre>
        </details>
      </div>
      )}

      <footer className="modal-footer">
        {parsed ? (
          <>
            <button type="button" className="btn-secondary" onClick={() => setParsed(null)}>
              Back
            </button>
            <button type="button" className="btn-danger-solid" onClick={doReplace}>
              Replace
            </button>
            <button
              type="button"
              className="btn-primary"
              data-default-focus
              onClick={doMerge}
            >
              Merge
            </button>
          </>
        ) : (
          <>
            <div className="footer-spacer" />
            <ModalCloseButton className="btn-secondary">
              Cancel
            </ModalCloseButton>
            <button
              type="button"
              className="btn-primary"
              data-default-focus
              onClick={handleImport}
              disabled={parsing || output.trim() === ""}
            >
              {parsing ? "Importing…" : "Import"}
            </button>
          </>
        )}
      </footer>
    </Modal>
  );
}
