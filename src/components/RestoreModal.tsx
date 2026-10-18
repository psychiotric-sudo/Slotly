import Modal, { ModalCloseButton } from "./Modal";
import Icon from "./icons";

interface RestoreModalProps {
  fileName: string;
  tabName: string;
  courseCount: number;
  breakCount: number;
  onMerge: () => void;
  onReplace: () => void;
  onClose: () => void;
}

export default function RestoreModal({
  fileName,
  tabName,
  courseCount,
  breakCount,
  onMerge,
  onReplace,
  onClose,
}: RestoreModalProps) {
  return (
    <Modal
      role="alertdialog"
      labelledBy="restore-title"
      onClose={onClose}
      className="delete-modal"
    >
      <header className="modal-header">
        <h2 id="restore-title">
          <Icon name="upload" size={17} /> Restore backup
        </h2>
        <ModalCloseButton className="icon-btn" aria-label="Close">
          <Icon name="x" />
        </ModalCloseButton>
      </header>

      <div className="modal-body">
        <p>
          <strong>{fileName}</strong> contains “{tabName}” with{" "}
          {courseCount} class{courseCount === 1 ? "" : "es"}
          {breakCount > 0
            ? ` and ${breakCount} break${breakCount === 1 ? "" : "s"}`
            : ""}
          .
        </p>
        <p className="settings-hint">
          Merge adds them to your current schedule (duplicates are skipped).
          Replace clears the current tab's classes and breaks first.
        </p>
      </div>

      <footer className="modal-footer">
        <ModalCloseButton className="btn-secondary">
          Cancel
        </ModalCloseButton>
        <button type="button" className="btn-danger-solid" onClick={onReplace}>
          Replace
        </button>
        <button
          type="button"
          className="btn-primary"
          data-default-focus
          onClick={onMerge}
        >
          Merge
        </button>
      </footer>
    </Modal>
  );
}
