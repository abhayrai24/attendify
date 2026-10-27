import { createContext, useContext } from "react";

export const ToastContext = createContext(null);
export const ConfirmContext = createContext(null);

/** toast(message, { type: "success" | "error" | "info" }) */
export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast must be used inside FeedbackProvider");
  return toast;
}

/** const ok = await confirm({ title, message, confirmLabel, danger }) */
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside FeedbackProvider");
  return confirm;
}
