"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AnexoArquivoRow } from "@/components/shared/anexo-arquivo-row";
import { atualizarRecebimento } from "@/lib/recebimento-viagem";
import { formatarMoeda } from "@/lib/frota-filters";
import {
  calcularTotalAReceber,
  RECEBIMENTO_STATUS_LABEL,
  type RecebimentoStatus,
} from "@/types/recebimento";
import type { RecebimentoComCanhotos } from "@/lib/recebimento-viagem";
import { cn } from "@/lib/utils";

export function RecebimentoLinha({
  item,
  onAtualizado,
}: {
  item: RecebimentoComCanhotos;
  onAtualizado: () => void;
}) {
  const [descargas, setDescargas] = useState(String(item.valor_descargas_adicionais || 0));
  const [dataRecebimento, setDataRecebimento] = useState(item.data_recebimento ?? "");
  const [status, setStatus] = useState<RecebimentoStatus>(item.status);
  const [observacao, setObservacao] = useState(item.observacao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [expandido, setExpandido] = useState(false);

  const descargasNum = Number(descargas.replace(",", ".")) || 0;
  const totalReceber = calcularTotalAReceber({
    valor_frete_liquido: item.valor_frete_liquido,
    valor_descargas_adicionais: descargasNum,
  });

  async function salvar() {
    setSalvando(true);
    const err = await atualizarRecebimento(item.id, {
      valor_descargas_adicionais: descargasNum,
      data_recebimento: dataRecebimento || null,
      status,
      observacao: observacao.trim() || null,
    });
    setSalvando(false);
    if (err) {
      alert(err);
      return;
    }
    onAtualizado();
  }

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
      <div className="grid gap-3 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-2">
          <p className="text-xs text-slate-500">Motorista</p>
          <p className="text-sm font-medium text-white">{item.motorista_nome}</p>
        </div>
        <div className="lg:col-span-1">
          <p className="text-xs text-slate-500">Placas</p>
          <p className="font-mono text-sm text-cyan-300">{item.veiculos_placas}</p>
        </div>
        <div className="lg:col-span-2">
          <p className="text-xs text-slate-500">Empresa (saída)</p>
          <p className="text-sm text-slate-300" title={item.empresa}>
            {item.empresa.length > 40 ? item.empresa.slice(0, 39) + "…" : item.empresa}
          </p>
        </div>
        <div className="lg:col-span-1">
          <p className="text-xs text-slate-500">Frete total</p>
          <p className="text-sm font-medium text-emerald-400">
            {formatarMoeda(item.valor_frete_total)}
          </p>
        </div>
        <div className="lg:col-span-1">
          <p className="text-xs text-slate-500">Frete líquido</p>
          <p className="text-sm text-slate-200" title="Bruto − 12% ICMS">
            {formatarMoeda(item.valor_frete_liquido)}
          </p>
        </div>
        <div className="lg:col-span-1">
          <Input
            label="Descargas/+"
            type="number"
            step="0.01"
            min="0"
            value={descargas}
            onChange={(e) => setDescargas(e.target.value)}
            className="text-sm"
          />
        </div>
        <div className="lg:col-span-1">
          <p className="text-xs text-slate-500">Total a receber</p>
          <p className="text-sm font-bold text-amber-300">{formatarMoeda(totalReceber)}</p>
        </div>
        <div className="lg:col-span-1">
          <Input
            label="Data receb."
            type="date"
            value={dataRecebimento}
            onChange={(e) => setDataRecebimento(e.target.value)}
            className="text-sm"
          />
        </div>
        <div className="lg:col-span-1">
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as RecebimentoStatus)}
            options={(
              Object.entries(RECEBIMENTO_STATUS_LABEL) as [RecebimentoStatus, string][]
            ).map(([v, l]) => ({ value: v, label: l }))}
          />
        </div>
        <div className="flex flex-col gap-1 lg:col-span-1">
          <Button type="button" className="h-9 text-xs" disabled={salvando} onClick={salvar}>
            {salvando ? "..." : "Salvar"}
          </Button>
          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            className="text-xs text-cyan-400 hover:underline"
          >
            Canhotos ({item.canhotos.length})
          </button>
        </div>
      </div>

      <div className="mt-3">
        <Input
          label="Observação"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Anotações sobre o recebimento..."
        />
      </div>

      {expandido && (
        <div className="mt-3 rounded-lg border border-slate-700/40 bg-slate-900/40 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Canhotos da viagem</p>
          {item.canhotos.length === 0 ? (
            <p className="text-xs text-slate-500">
              Nenhum canhoto anexado. Adicione no Acompanhamento da viagem.
            </p>
          ) : (
            <ul className="space-y-1">
              {item.canhotos.map((c) => (
                <li key={c.id}>
                  <AnexoArquivoRow label={c.file_name} storagePath={c.storage_path} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p
        className={cn(
          "mt-2 text-[10px] text-slate-600",
          status === "vencido" && "text-red-400",
          status === "pago" && "text-emerald-500"
        )}
      >
        Frete líquido = frete total − 12% ICMS · Total = líquido + descargas/adicionais
      </p>
    </div>
  );
}
