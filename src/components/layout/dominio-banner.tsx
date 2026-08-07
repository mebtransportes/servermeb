"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  diasRestantesDominio,
  mensagemAlertaDominio,
  nivelAlertaDominio,
} from "@/lib/gerenciamento";
import { cn } from "@/lib/utils";

export function DominioBanner({ expiraEm }: { expiraEm: string | null }) {
  const dias = diasRestantesDominio(expiraEm);
  const nivel = nivelAlertaDominio(dias);
  const msg = mensagemAlertaDominio(dias);
  if (!msg || nivel === "ok") return null;

  const urgente = nivel === "vencido" || nivel === "2";

  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
        urgente
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-amber-200 bg-amber-50 text-amber-950"
      )}
      role="status"
    >
      <div className="flex min-w-0 items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="font-medium">{msg}</p>
      </div>
      <Link
        href="/configuracoes/gerenciamento"
        className={cn(
          "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold underline-offset-2 hover:underline",
          urgente ? "text-red-800" : "text-amber-900"
        )}
      >
        Abrir Gerenciamento
      </Link>
    </div>
  );
}
