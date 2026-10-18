import Modal, { ModalCloseButton } from "./Modal";
import Icon from "./icons";

interface ImportChoiceModalProps {
  sourceLabel: string;
  courseCount: number;
  breakCount: number;
  existingCount: number;
  onMerge: () => void;
  onReplace: () => void;
  onClose: () => void;
}

export default function ImportChoiceModal({
  sourceLabel,
  courseCount,
  breakCount,
  existingCount,
  onMerge,
  onReplace,
  onClose,
}: ImportChoiceModalProps) {
  return (
    <Modal
      role="alertdialog"
      labelledBy="import-choice-title"
      onClose={onClose}
      className="delete-modal"
    >
      <header className="modal-header">
        <h2 id="import-choice-title">
          <Icon name="upload" size={17} /> Import schedule
        </h2>
        <ModalCloseButton className="icon-btn" aria-label="Close">
          <Icon name="x" />
        </ModalCloseButton>
      </header>

      <div className="modal-body">
        <p>
          <strong>{sourceLabel}</strong> contains {courseCount} class
          {courseCount === 1 ? "" : "es"}
          {breakCount > 0 ? ` and ${breakCount} break${breakCount === 1 ? "" : "s"}` : ""}
          . Your current tab has {existingCount} class{existingCount === 1 ? "" : "es"}.
        </p>
        <p className="settings-hint">
          Merge adds them to your current schedule (duplicate breaks are skipped).
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
