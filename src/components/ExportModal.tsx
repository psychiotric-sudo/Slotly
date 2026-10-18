import Modal, { ModalCloseButton } from "./Modal";
import Icon from "./icons";
import ExportThemeEditor from "./ExportThemeEditor";
import type { ExportTheme } from "../types";

interface ExportModalProps {
  theme: ExportTheme;
  disabled: boolean;
  onThemeChange: (theme: ExportTheme) => void;
  onExport: (kind: "jpg" | "pdf") => void;
  onCopyShareLink: () => void;
  onClose: () => void;
}

export default function ExportModal({
  theme,
  disabled,
  onThemeChange,
  onExport,
  onCopyShareLink,
  onClose,
}: ExportModalProps) {
  return (
    <Modal role="dialog" labelledBy="export-modal-title" onClose={onClose} className="export-modal">
      <header className="modal-header">
        <h2 id="export-modal-title">Export schedule</h2>
        <ModalCloseButton className="icon-btn" aria-label="Close">
          <Icon name="x" />
        </ModalCloseButton>
      </header>
      <div className="modal-body">
        <p className="settings-hint">
          Preview below, tweak the colors if you like, then export — live to JPG or PDF.
        </p>
        <ExportThemeEditor theme={theme} onChange={onThemeChange} />
        <div className="export-share">
          <div className="export-share-copy">
            <strong>Share link</strong>
            <p className="settings-hint">
              A link that opens this exact schedule on any device — no account
              needed.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={onCopyShareLink}
            disabled={disabled}
          >
            <Icon name="link" size={16} />
            Copy link
          </button>
        </div>
      </div>
      <footer className="modal-footer">
        <ModalCloseButton className="btn-secondary">
          Cancel
        </ModalCloseButton>
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