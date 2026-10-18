import Modal, { ModalCloseButton } from "./Modal";

interface DeleteModalProps {
  title: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteModal({ title, onConfirm, onClose }: DeleteModalProps) {
  return (
    <Modal
      role="alertdialog"
      labelledBy="delete-modal-title"
      onClose={onClose}
      className="delete-modal"
    >
      <h2 id="delete-modal-title">Delete this class?</h2>
      <p>
        "{title}" will be permanently removed from your schedule. This can't be
        undone.
      </p>
      <div className="modal-footer">
        <div className="footer-spacer" />
        <ModalCloseButton className="btn-ghost" data-default-focus>
          Cancel
        </ModalCloseButton>
        <button type="button" className="btn-danger-solid" onClick={onConfirm}>
          Delete
        </button>
      </div>
    </Modal>
  );
}
