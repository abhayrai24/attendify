import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { ConfirmContext, ToastContext } from "./feedback.js";

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };

function ConfirmDialog({ request, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (request && dialog && !dialog.open) dialog.showModal();
  }, [request]);

  if (!request) return null;
  return (
    <dialog ref={ref} className="dialog" onCancel={() => onClose(false)} aria-labelledby="confirm-title">
      <h2 id="confirm-title">{request.title}</h2>
      <p>{request.message}</p>
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={() => onClose(false)} autoFocus>
          {request.cancelLabel || "Cancel"}
        </button>
        <button
          type="button"
          className={request.danger ? "btn btn-danger" : "btn btn-primary"}
          onClick={() => onClose(true)}
        >
          {request.confirmLabel || "Confirm"}
        </button>
      </div>
    </dialog>
  );
}

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [request, setRequest] = useState(null);
  const resolver = useRef(null);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (message, { type = "info", duration = 4000 } = {}) => {
      const id = (nextId.current += 1);
      setToasts((list) => [...list.slice(-3), { id, message, type }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setRequest(options);
      }),
    [],
  );

  const closeConfirm = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setRequest(null);
  };

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={confirm}>
        {children}
        <ConfirmDialog request={request} onClose={closeConfirm} />
        <div className="toasts" role="status" aria-live="polite">
          {toasts.map((t) => {
            const Icon = ICONS[t.type] || Info;
            return (
              <div key={t.id} className={`toast toast-${t.type}`}>
                <Icon size={18} aria-hidden="true" />
                <span>{t.message}</span>
                <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}
