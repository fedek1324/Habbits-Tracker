"use client";

import { ReactNode, useEffect, useRef } from "react";

type ModalProps = {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  children: ReactNode;
};

const Modal: React.FC<ModalProps> = ({ modalOpen, setModalOpen, children }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (modalOpen) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [modalOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="rounded-2xl p-6 w-full max-w-md shadow-xl bg-white fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 m-0"
      onCancel={() => setModalOpen(false)}
      onClose={() => setModalOpen(false)}
    >
      <button
        onClick={() => setModalOpen(false)}
        className="text-gray-500 hover:text-gray-700 text-2xl font-bold absolute top-4 right-4"
        aria-label="Close"
      >
        ×
      </button>
      {children}
    </dialog>
  );
};

export default Modal;