import { useState } from "react";
import Modal from "./Modal";
import Icon from "./icons";
import { GEMINI_PROMPT, parseGeminiJson } from "../utils/gemini";
import { GEMINI_URL } from "../utils/gcal";
import type { CourseEntry } from "../types";

interface GeminiModalProps {
  onImport: (courses: CourseEntry[], label: string) => void;
  onClose: () => void;
}

export default function GeminiModal({ onImport, onClose }: GeminiModalProps) {
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

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
        const entries = parseGeminiJson(output);
        onImport(entries, "Gemini");
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not parse that JSON.");
      } finally {
        setParsing(false);
      }
    }, 0);
  };

  return (
    <Modal role="dialog" labelledBy="gemini-title" onClose={onClose} className="gemini-modal">
      <header className="modal-header">
        <h2 id="gemini-title">
          <Icon name="sparkles" size={17} /> Import with Gemini AI
        </h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          <Icon name="x" />
        </button>
      </header>

      <div className="modal-body">
        <ol className="gemini-steps">
          <li>
            <p>
              Take a photo of your class schedule and{" "}
              <a href={GEMINI_URL} target="_blank" rel="noreferrer">
                upload it to Gemini <Icon name="external" size={13} />
              </a>
              .
            </p>
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
  ]
}`}</pre>
        </details>
      </div>

      <footer className="modal-footer">
        <div className="footer-spacer" />
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          data-default-focus
          onClick={handleImport}
          disabled={parsing || output.trim() === ""}
        >
          {parsing ? "Importing…" : "Import"}
        </button>
      </footer>
    </Modal>
  );
}
