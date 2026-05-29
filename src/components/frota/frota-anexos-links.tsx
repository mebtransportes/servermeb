"use client";

import { useEffect, useState } from "react";
import { getFileUrl } from "@/lib/storage";
import { FileText } from "lucide-react";

type AnexosInfo = {
  nota_fiscal_path?: string | null;
  nota_fiscal_nome?: string | null;
  comprovante_path?: string | null;
  comprovante_nome?: string | null;
};

function LinkAnexo({ path, label }: { path: string; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    getFileUrl(path).then(setUrl);
  }, [path]);

  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline"
    >
      <FileText className="h-3 w-3" />
      {label}
    </a>
  );
}

export function FrotaAnexosLinks({ anexos }: { anexos: AnexosInfo }) {
  if (!anexos.nota_fiscal_path && !anexos.comprovante_path) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-3">
      {anexos.nota_fiscal_path && (
        <LinkAnexo
          path={anexos.nota_fiscal_path}
          label={anexos.nota_fiscal_nome ?? "Nota fiscal"}
        />
      )}
      {anexos.comprovante_path && (
        <LinkAnexo
          path={anexos.comprovante_path}
          label={anexos.comprovante_nome ?? "Comprovante"}
        />
      )}
    </div>
  );
}
