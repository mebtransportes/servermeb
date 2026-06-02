"use client";

import { useState } from "react";
import { FileText, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentacaoAvisos } from "@/components/frota/documentacao-avisos";

type Aba = "avisos";

const ABAS: { id: Aba; label: string; icon: typeof Bell }[] = [
  { id: "avisos", label: "Avisos", icon: Bell },
];

export default function FrotaDocumentacaoPage() {
  const [aba, setAba] = useState<Aba>("avisos");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <FileText className="h-8 w-8 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold">Documentação</h1>
          <p className="text-slate-400">
            Vencimentos de CNH, toxicológico, CRLV e IPVA
          </p>
        </div>
      </header>

      <div className="flex gap-1 border-b border-slate-700/60">
        {ABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setAba(item.id)}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition -mb-px",
              aba === item.id
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      {aba === "avisos" && <DocumentacaoAvisos />}
    </div>
  );
}
