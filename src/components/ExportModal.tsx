import Modal from "./Modal";
import Icon from "./icons";
import ExportThemeEditor from "./ExportThemeEditor";
import type { ExportTheme } from "../types";

interface ExportModalProps {
  theme: ExportTheme;
  disabled: boolean;
  onThemeChange: (theme: ExportTheme) => void;
  onExport: (kind: "jpg" | "pdf") => void;
  onClose: () => void;
}

export default function ExportModal({
  theme,
  disabled,
  onThemeChange,
  onExport,
  onClose,
}: ExportModalProps) {
  return (
    <Modal role="dialog" labelledBy="export-modal-title" onClose={onClose} className="export-modal">
      <header className="modal-header">
        <h2 id="export-modal-title">Export schedule</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          <Icon name="x" />
        </button>
      </header>
      <div className="modal-body">
        <p className="settings-hint">
          Preview below, tweak the colors if you like, then export — live to JPG or PDF.
        </p>
        <ExportThemeEditor theme={theme} onChange={onThemeChange} />
      </div>
      <footer className="modal-footer">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <div className="footer-spacer" />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onExport("jpg")}
          disabled={disabled}
        >
          <Icon name="image" size={16} />
          Save as Image
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => onExport("pdf")}
          disabled={disabled}
        >
          <Icon name="pdf" size={16} />
          Save as PDF
        </button>
      </footer>
    </Modal>
  );
}