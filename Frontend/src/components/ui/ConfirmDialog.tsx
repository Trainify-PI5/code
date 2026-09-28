import { useState, type ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";
import Button from "./Button";
import Modal from "./Modal";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  /** Pode ser assincrono: o botao entra em "carregando" ate resolver. */
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" para acoes destrutivas (excluir). */
  tone?: "danger" | "default";
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "default",
}: ConfirmDialogProps) {
  const [processando, setProcessando] = useState(false);
  const perigo = tone === "danger";

  const confirmar = async () => {
    setProcessando(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={processando ? () => {} : onClose}
      size="sm"
      hideCloseButton
      ariaLabel={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={processando}>
            {cancelLabel}
          </Button>
          <Button
            onClick={confirmar}
            disabled={processando}
            className={
              perigo
                ? "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                : undefined
            }
          >
            {processando ? "Aguarde..." : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <div
          className={
            perigo
              ? "w-11 h-11 shrink-0 rounded-full flex items-center justify-center bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              : "w-11 h-11 shrink-0 rounded-full flex items-center justify-center bg-primary-fixed text-primary"
          }
        >
          {perigo ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <Info className="w-5 h-5" />
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <h2 className="font-display font-bold text-on-surface">{title}</h2>
          {message && (
            <div className="text-sm text-on-surface-variant">{message}</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
