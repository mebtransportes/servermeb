"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  MebModal,
  MebModalBody,
  MebModalFooter,
  MebModalHeader,
} from "@/components/ui/modal";
import {
  registerMebDialog,
  unregisterMebDialog,
  type MebAlertOptions,
  type MebConfirmOptions,
} from "@/lib/meb-dialog";

type DialogRequest =
  | {
      kind: "confirm";
      message: string;
      options?: MebConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | {
      kind: "alert";
      message: string;
      options?: MebAlertOptions;
      resolve: () => void;
    };

type MebDialogContextValue = {
  confirm: (message: string, options?: MebConfirmOptions) => Promise<boolean>;
  alert: (message: string, options?: MebAlertOptions) => Promise<void>;
};

const MebDialogContext = createContext<MebDialogContextValue | null>(null);

export function MebDialogProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null);

  const confirm = useCallback(
    (message: string, options?: MebConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setRequest({ kind: "confirm", message, options, resolve });
      }),
    []
  );

  const alert = useCallback(
    (message: string, options?: MebAlertOptions) =>
      new Promise<void>((resolve) => {
        setRequest({ kind: "alert", message, options, resolve });
      }),
    []
  );

  useEffect(() => {
    registerMebDialog({ confirm, alert });
    return () => unregisterMebDialog();
  }, [confirm, alert]);

  function closeWith(result: boolean) {
    if (!request) return;
    if (request.kind === "confirm") request.resolve(result);
    else if (result) request.resolve();
    setRequest(null);
  }

  const isConfirm = request?.kind === "confirm";
  const title =
    request?.options?.title ??
    (request?.kind === "confirm"
      ? request.options?.variant === "danger"
        ? "Confirmar exclusão"
        : "Confirmar"
      : "Aviso");

  return (
    <MebDialogContext.Provider value={{ confirm, alert }}>
      {children}
      <MebModal
        open={request != null}
        onClose={() => closeWith(false)}
        aria-labelledby="meb-dialog-titulo"
        maxWidth="max-w-md"
      >
        <div className="p-6">
          <MebModalHeader
            id="meb-dialog-titulo"
            title={title}
            onClose={() => closeWith(false)}
          />
          <MebModalBody className="mt-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
              {request?.message}
            </p>
          </MebModalBody>
          <MebModalFooter className="mt-6 justify-end">
            {isConfirm ? (
              <>
                <Button
                  type="button"
                  variant={
                    request.options?.variant === "danger" ? "danger" : "modal"
                  }
                  onClick={() => closeWith(true)}
                >
                  {request.options?.confirmLabel ?? "Confirmar"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => closeWith(false)}
                >
                  {request.options?.cancelLabel ?? "Cancelar"}
                </Button>
              </>
            ) : (
              <Button type="button" variant="modal" onClick={() => closeWith(true)}>
                {request?.kind === "alert"
                  ? (request.options?.okLabel ?? "OK")
                  : "OK"}
              </Button>
            )}
          </MebModalFooter>
        </div>
      </MebModal>
    </MebDialogContext.Provider>
  );
}

export function useMebDialog() {
  const ctx = useContext(MebDialogContext);
  if (!ctx) {
    throw new Error("useMebDialog deve ser usado dentro de MebDialogProvider");
  }
  return ctx;
}
