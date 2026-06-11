export type MebConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
};

export type MebAlertOptions = {
  title?: string;
  okLabel?: string;
};

type MebDialogApi = {
  confirm: (message: string, options?: MebConfirmOptions) => Promise<boolean>;
  alert: (message: string, options?: MebAlertOptions) => Promise<void>;
};

let api: MebDialogApi | null = null;

export function registerMebDialog(dialogApi: MebDialogApi) {
  api = dialogApi;
}

export function unregisterMebDialog() {
  api = null;
}

export async function mebConfirm(
  message: string,
  options?: MebConfirmOptions
): Promise<boolean> {
  if (api) return api.confirm(message, options);
  return window.confirm(message);
}

export async function mebAlert(
  message: string,
  options?: MebAlertOptions
): Promise<void> {
  if (api) await api.alert(message, options);
  else window.alert(message);
}
