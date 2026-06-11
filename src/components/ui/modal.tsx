"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type MebModalProps = {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  panelClassName?: string;
  maxWidth?: string;
  "aria-labelledby"?: string;
};

export function MebModal({
  open,
  onClose,
  children,
  className,
  panelClassName,
  maxWidth = "max-w-md",
  "aria-labelledby": ariaLabelledby,
}: MebModalProps) {
  if (!open) return null;

  return (
    <div
      className={cn(
        "meb-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]",
        className
      )}
      onClick={
        onClose
          ? (e) => {
              if (e.target === e.currentTarget) onClose();
            }
          : undefined
      }
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledby}
        className={cn(
          "meb-modal w-full rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] shadow-xl",
          maxWidth,
          panelClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function MebModalHeader({
  title,
  description,
  onClose,
  id,
}: {
  title: string;
  description?: string;
  onClose?: () => void;
  id?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 id={id} className="text-lg font-bold text-white">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 transition hover:bg-[#262626] hover:text-white"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

export function MebModalBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("text-slate-300", className)}>{children}</div>;
}

export function MebModalFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-wrap gap-2", className)}>{children}</div>;
}
