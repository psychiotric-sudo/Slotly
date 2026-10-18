import { useState } from "react";
import Modal, { ModalCloseButton } from "./Modal";
import Icon from "./icons";
import { GEMINI_URL, openGeminiApp } from "../utils/gcal";
import {
  COMPARE_PROMPT,
  countClashes,
  freeWindows,
  groupFreeByDay,
  parseCompareJson,
  type CompareResult,
  type SectionSchedule,
} from "../utils/compare";
import { formatTime12, minutesToTime } from "../utils/time";
import type { CourseEntry } from "../types";
import { DAY_LABELS } from "../types";

interface CompareModalProps {
  ownCourses: CourseEntry[];
  onImportSection: (courses: CourseEntry[], name: string) => void;
  onClose: () => void;
}

function SectionPanel({
  section,
  ownCourses,
  onUse,
}: {
  section: SectionSchedule;
  ownCourses: CourseEntry[];
  onUse: () => void;
}) {
  const clashes = countClashes(section.courses, ownCourses);
  const meetsOn = new Set(section.courses.map((c) => c.day));
  const windows = groupFreeByDay(
    freeWindows(section.courses).filter(
      (w) =>
        meetsOn.has(w.day) ||
        (w.day !== "SAT" && w.day !== "SUN")
    )
  );

  return (
    <section className="compare-section">
      <header className="compare-section-head">
        <h3>{section.name}</h3>
        <span>
          {section.courses.length} class{section.courses.length === 1 ? "" : "es"}
        </span>
      </header>

      {ownCourses.length > 0 && (
        <p
          className={`compare-verdict ${
            clashes > 0 ? "compare-verdict--bad" : "compare-verdict--good"
          }`}
        >
          {clashes > 0
            ? `Clashes with ${clashes} of your class${clashes === 1 ? "" : "es"}`
            : "No clashes with your schedule"}
        </p>
      )}

      <div className="compare-free">
        <h4>Vacant windows</h4>
        {windows.length === 0 ? (
          <p className="compare-free-empty">Fully packed — no free windows.</p>
        ) : (
          windows.map((group) => (
            <div key={group.day} className="compare-free-day">
              <span className="compare-free-day-name">{DAY_LABELS[group.day]}</span>
              <span className="compare-free-day-times">
                {group.windows
                  .map(
                    (w) =>
                      `${formatTime12(minutesToTime(w.startMin))}–${formatTime12(minutesToTime(w.endMin))}`
                  )
                  .join("  ·  ")}
              </span>
            </div>
          ))
        )}
      </div>

      <button type="button" className="btn-primary" onClick={onUse}>
        Use {section.name}
      </button>
    </section>
  );
}

export default function CompareModal({
  ownCourses,
  onImportSection,
  onClose,
}: CompareModalProps) {
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<CompareResult | null>(null);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(COMPARE_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically — select the prompt text and copy it manually.");
    }
  };

  const handleCompare = () => {
    setError(null);
    try {
      setParsed(parseCompareJson(output));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse that JSON.");
    }
  };

  const useSection = (section: SectionSchedule) => {
    onImportSection(section.courses, section.name);
    onClose();
  };

  const hasB = parsed ? parsed.sectionB.courses.length > 0 : false;

  return (
    <Modal
      role="dialog"
      labelledBy="compare-title"
      onClose={onClose}
      className={`gemini-modal${parsed ? " compare-modal--results" : ""}`}
    >
      <header className="modal-header">
        <h2 id="compare-title">
          <Icon name="sliders" size={17} />
          {parsed ? "Compare sections" : "Compare two sections"}
        </h2>
        <ModalCloseButton className="icon-btn" aria-label="Close">
          <Icon name="x" />
        </ModalCloseButton>
      </header>

      {parsed ? (
        <div className="modal-body compare-results">
          {ownCourses.length === 0 && (
            <p className="settings-hint">
              Your planner is empty — add your other subjects first to see which
              section clashes with them. Vacant windows below are still accurate.
            </p>
          )}
          <div className={`compare-grid${hasB ? "" : " compare-grid--single"}`}>
            <SectionPanel
              section={parsed.sectionA}
              ownCourses={ownCourses}
              onUse={() => useSection(parsed.sectionA)}
            />
            {hasB && (
              <SectionPanel
                section={parsed.sectionB}
                ownCourses={ownCourses}
                onUse={() => useSection(parsed.sectionB)}
              />
            )}
          </div>
          <p className="settings-hint">
            "Use" merges that section's classes into your planner — the normal
            clash flags take it from there.
          </p>
        </div>
      ) : (
        <div className="modal-body">
          <ol className="gemini-steps">
            <li>
              <p>
                Photograph both section schedules (e.g. Section A and Section B),
                or grab text versions. Then{" "}
                <a href={GEMINI_URL} target="_blank" rel="noreferrer">
                  open Gemini <Icon name="external" size={13} />
                </a>{" "}
                and attach both photos.
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
              <p>Copy the comparison prompt, paste it into Gemini, and send it.</p>
              <div className="prompt-box">
                <button
                  type="button"
                  className={`btn-primary prompt-copy${copied ? " copied" : ""}`}
                  onClick={copyPrompt}
                >
                  <Icon name={copied ? "check" : "file"} size={14} />
                  {copied ? "Copied" : "Copy prompt"}
                </button>
                <pre>{COMPARE_PROMPT}</pre>
              </div>
            </li>
            <li>
              <p>
                Copy the JSON Gemini returns and paste it here, then hit{" "}
                <strong>Compare</strong>.
              </p>
              <textarea
                className="input paste-area"
                value={output}
                onChange={(e) => setOutput(e.target.value)}
                placeholder='{"sectionA":{"name":"Section A","courses":[…]},"sectionB":{"name":"Section B","courses":[…]}}'
                rows={6}
              />
            </li>
          </ol>
          {error && <p className="form-error">{error}</p>}
        </div>
      )}

      <footer className="modal-footer">
        {parsed ? (
          <>
            <button type="button" className="btn-secondary" onClick={() => setParsed(null)}>
              Back
            </button>
            <div className="footer-spacer" />
            <ModalCloseButton className="btn-primary" data-default-focus>
              Done
            </ModalCloseButton>
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
              onClick={handleCompare}
              disabled={output.trim() === ""}
            >
              Compare
            </button>
          </>
        )}
      </footer>
    </Modal>
  );
}
