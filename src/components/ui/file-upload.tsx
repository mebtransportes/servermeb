"use client";

import { useRef } from "react";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

type FileUploadFieldProps = {
  label?: string;
  accept?: string;
  file: File | null;
  onChange: (file: File | null) => void;
  hint?: string;
  className?: string;
};

export function FileUploadField({
  label,
  accept = "application/pdf,image/*",
  file,
  onChange,
  hint = "PDF ou imagem",
  className,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function limpar() {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <span className="text-sm font-semibold tracking-wide text-slate-200">
          {label}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/60 px-4 py-5 transition hover:border-cyan-500 hover:bg-slate-800"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-600/20 transition group-hover:bg-cyan-600/30">
            <Upload className="h-5 w-5 text-cyan-400" />
          </span>
          <span className="text-sm font-medium text-cyan-400">
            Procurar documento
          </span>
          <span className="text-xs text-slate-500">{hint}</span>
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-600/40 bg-emerald-950/25 px-3 py-3">
          <FileText className="h-5 w-5 shrink-0 text-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-200">{file.name}</p>
            <p className="text-xs text-slate-500">
              {(file.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <button
            type="button"
            onClick={limpar}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-red-400"
            title="Remover arquivo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

type FileUploadMultipleProps = {
  label?: string;
  accept?: string;
  files: File[];
  onChange: (files: File[]) => void;
  hint?: string;
  className?: string;
};

export function FileUploadMultiple({
  label,
  accept = "application/pdf,image/*",
  files,
  onChange,
  hint = "PDF ou imagem — pode selecionar vários",
  className,
}: FileUploadMultipleProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function remover(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  function adicionar(novos: FileList | null) {
    if (!novos?.length) return;
    onChange([...files, ...Array.from(novos)]);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <span className="text-sm font-medium text-slate-300">{label}</span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="sr-only"
        onChange={(e) => adicionar(e.target.files)}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/60 px-4 py-4 transition hover:border-cyan-500 hover:bg-slate-800"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-600/20 transition group-hover:bg-cyan-600/30">
          <Upload className="h-4 w-4 text-cyan-400" />
        </span>
        <span className="text-sm font-medium text-cyan-400">
          Procurar comprovantes
        </span>
        <span className="text-xs text-slate-500">{hint}</span>
      </button>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-lg border border-emerald-600/40 bg-emerald-950/25 px-3 py-2"
            >
              <FileText className="h-4 w-4 shrink-0 text-emerald-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-200">{file.name}</p>
                <p className="text-xs text-slate-500">
                  {(file.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={() => remover(index)}
                className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-red-400"
                title="Remover"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
