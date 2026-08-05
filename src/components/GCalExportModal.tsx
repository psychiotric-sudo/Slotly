import Modal from "./Modal";
import Icon from "./icons";

const GCAL_IMPORT_URL = "https://calendar.google.com/calendar/r/settings/export";

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
          Slotly downloads a small calendar file (.ics) containing all your classes.
          Import it in Google Calendar to add them automatically.
        </p>
        <ol className="step-list">
          <li>
            Tap <strong>Download .ics file</strong> below to save it to your device.
          </li>
          <li>Open the Google Calendar import page.</li>
          <li>
            Under <strong>Import &amp; export → Import</strong>, choose the downloaded
            file, pick the calendar to add it to, then click Import.
          </li>
        </ol>
        <p className="modal-hint">
          <Icon name="inbox" size={13} /> On iPhone the file lands in your Files app
          (Downloads folder).
        </p>
      </div>

      <footer className="modal-footer">
        <div className="footer-spacer" />
        <a className="btn-secondary" href={GCAL_IMPORT_URL} target="_blank" rel="noreferrer">
          Open Google Calendar import page
          <Icon name="external" size={13} className="btn-trailing" />
        </a>
        <button type="button" className="btn-primary" data-default-focus onClick={onDownload}>
          <Icon name="download" size={16} /> Download .ics file
        </button>
      </footer>
    </Modal>
  );
}
