import { toast } from "sonner";

export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showError = (message: string) => {
  toast.error(message);
};

export const showUndo = (message: string, onUndo: () => void | Promise<void>) => {
  toast.success(message, {
    action: {
      label: "Undo",
      onClick: () => void onUndo(),
    },
  });
};

export const showLoading = (message: string) => {
  return toast.loading(message);
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};
