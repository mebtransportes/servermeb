"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { gerarPdfComissaoMotorista } from "@/lib/comissao-pdf";
import { filtrarPorPeriodoConfig } from "@/lib/custos-operacionais";
import type { PeriodoFiltroState } from "@/lib/frota-filters";
import type { ViagemFechamento } from "@/types/fechamento";
import { FileText, X } from "lucide-react";

export function GerarComissaoModal({
  motoristaNome,
  fechamentos,
  onClose,
}: {
  motoristaId: string;
  motoristaNome: string;
  fechamentos: ViagemFechamento[];
  onClose: () => void;
}) {
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  function gerar() {
    if (!de || !ate) {
      alert("Informe a data inicial e final do período.");
      return;
    }
    const config: PeriodoFiltroState = { preset: "custom", dataDe: de, dataAte: ate };
    const lista = filtrarPorPeriodoConfig(fechamentos, config);
    if (!lista.length) {
      alert("Nenhuma viagem finalizada neste período para este motorista.");
      return;
    }
    const periodoLabel = `${de.split("-").reverse().join("/")} a ${ate.split("-").reverse().join("/")}`;
    gerarPdfComissaoMotorista({
      motoristaNome,
      periodoLabel,
      fechamentos: lista,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Gerar comissão</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-400">
          Motorista: <span className="text-slate-200">{motoristaNome}</span>
        </p>
        <p className="mb-3 text-xs text-slate-500">
          Escolha o período. Será gerado um PDF (holerite) com todas as viagens e o total de
          comissão, com linha para assinatura.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">De</label>
            <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Até</label>
            <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={gerar}>
            <FileText className="mr-2 h-4 w-4" />
            Gerar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
