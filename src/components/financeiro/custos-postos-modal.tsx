"use client";

import { FileDown, Fuel, Gauge, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MebModal, MebModalBody, MebModalFooter, MebModalHeader } from "@/components/ui/modal";
import { gerarPdfCustosPostos } from "@/lib/custos-postos-pdf";
import type { CustosPostosResumo } from "@/lib/custos-operacionais";
import { formatarDataHoraBr, formatarMoeda } from "@/lib/frota-filters";

export function CustosPostosModal({
  resumo,
  periodoLabel,
  loading,
  onClose,
}: {
  resumo: CustosPostosResumo | null;
  periodoLabel: string;
  loading: boolean;
  onClose: () => void;
}) {
  function baixarPdf() {
    if (resumo) gerarPdfCustosPostos(resumo, periodoLabel);
  }

  return (
    <MebModal
      open
      onClose={onClose}
      maxWidth="max-w-6xl"
      panelClassName="flex max-h-[90vh] flex-col"
      aria-labelledby="custos-postos-titulo"
    >
      <div className="border-b border-[#2a2a2a] p-5">
        <MebModalHeader
          id="custos-postos-titulo"
          title="Custos de Postos"
          description={`Abastecimentos por posto no período: ${periodoLabel}. Inclui frota própria e abastecimentos lançados dentro das viagens.`}
          onClose={onClose}
        />
      </div>

      <MebModalBody className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <p className="py-12 text-center text-slate-500">Carregando abastecimentos...</p>
        ) : !resumo || resumo.abastecimentos.length === 0 ? (
          <p className="py-12 text-center text-slate-500">
            Nenhum abastecimento encontrado no período selecionado.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Resumo
                icon={Fuel}
                label="Total em combustível"
                value={formatarMoeda(resumo.total)}
              />
              <Resumo
                icon={Gauge}
                label="Litros abastecidos"
                value={`${resumo.litros.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })} L`}
              />
              <Resumo
                icon={MapPin}
                label="Postos"
                value={String(resumo.postos.length)}
              />
            </div>

            <div className="space-y-4">
              {resumo.postos.map((grupo) => (
                <GrupoPosto key={grupo.posto} grupo={grupo} />
              ))}
            </div>
          </div>
        )}
      </MebModalBody>

      <MebModalFooter className="border-t border-[#2a2a2a] p-5">
        <Button type="button" variant="secondary" onClick={onClose}>
          Fechar
        </Button>
        <Button
          type="button"
          variant="modal"
          onClick={baixarPdf}
          disabled={loading || !resumo?.abastecimentos.length}
        >
          <FileDown className="h-4 w-4" />
          Baixar PDF
        </Button>
      </MebModalFooter>
    </MebModal>
  );
}

function Resumo({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Fuel;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-[#242424] p-3">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="h-4 w-4 text-cyan-400" />
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}

function GrupoPosto({
  grupo,
}: {
  grupo: CustosPostosResumo["postos"][number];
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-700 bg-[#202020]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-white">
            <MapPin className="h-4 w-4 text-cyan-400" />
            {grupo.posto}
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            {grupo.abastecimentos.length} abastecimento(s) ·{" "}
            {grupo.litros.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} L
          </p>
        </div>
        <p className="text-lg font-bold tabular-nums text-emerald-300">
          {formatarMoeda(grupo.total)}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left text-xs">
          <thead className="bg-[#292929] text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 font-medium">Caminhão / cavalo</th>
              <th className="px-4 py-2 font-medium">CT-e</th>
              <th className="px-4 py-2 font-medium">Combustível</th>
              <th className="px-4 py-2 text-right font-medium">Litros</th>
              <th className="px-4 py-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {grupo.abastecimentos.map((item) => (
              <tr key={item.id} className="border-t border-slate-800">
                <td className="whitespace-nowrap px-4 py-2">{formatarDataHoraBr(item.data)}</td>
                <td className="px-4 py-2">
                  {item.veiculo} <span className="font-mono text-slate-400">({item.placa})</span>
                </td>
                <td className="px-4 py-2 font-mono">{item.cte}</td>
                <td className="px-4 py-2">{item.combustivel}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {item.litros > 0
                    ? `${item.litros.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} L`
                    : "—"}
                </td>
                <td className="px-4 py-2 text-right font-semibold tabular-nums text-white">
                  {formatarMoeda(item.valor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
