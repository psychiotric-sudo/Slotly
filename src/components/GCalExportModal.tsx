import Modal from "./Modal";
import Icon from "./icons";

interface GCalExportModalProps {
  onDownload: () => void;
  onClose: () => void;
}

export default function GCalExportModal({ onDownload, onClose }: GCalExportModalProps) {
  return (
    <Modal role="dialog" labelledBy="gcal-export-title" onClose={onClose} className="gcal-modal">
      <header className="modal-header">
        <h2 id="gcal-export-title">
          <Icon name="calendar" size={17} /> Export to Google Calendar
        </h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          <Icon name="x" />
        </button>
      </header>

      <div className="modal-body">
        <p>
          Slotly downloads a small calendar file (.ics) containing all your classes,
          then opens the Google Calendar import page so you can add them automatically.
        </p>
        <ol className="step-list">
          <li>
            Tap <strong>Download &amp; redirect</strong> below — Slotly saves the file
            and opens the Google Calendar import page in a new tab.
          </li>
          <li>
            On the import page, choose the downloaded file, pick which calendar to add
            it to, then click <strong>Import</strong>.
          </li>
        </ol>
        <p className="modal-hint">
          <Icon name="inbox" size={13} /> On iPhone the file lands in your Files app
          (Downloads folder).
        </p>
      </div>

      <footer className="modal-footer">
        <div className="footer-spacer" />
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn-primary" data-default-focus onClick={onDownload}>
          <Icon name="download" size={16} /> Download &amp; redirect
        </button>
      </footer>
    </Modal>
  );
}
