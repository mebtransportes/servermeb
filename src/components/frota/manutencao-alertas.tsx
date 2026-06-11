"use client";

import { useMemo } from "react";
import { AlertTriangle, CalendarClock, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  labelStatusAlertaManutencao,
  montarAlertasManutencao,
  resumoAlertasManutencao,
  type AlertaManutencaoPreventiva,
} from "@/lib/manutencao-alertas";
import { formatarDataBr } from "@/lib/frota-filters";
import { cn } from "@/lib/utils";
import type { ManutencaoCard } from "@/types/frota";

export type ManutencaoPrefill = {
  nome?: string;
  veiculoId?: string;
  data?: string;
};

function StatusBadge({ alerta }: { alerta: AlertaManutencaoPreventiva }) {
  const tones = {
    atrasado: "bg-red-100 text-red-800",
    hoje: "bg-amber-100 text-amber-900",
    amanha: "bg-amber-50 text-amber-800",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[alerta.status]
      )}
    >
      {labelStatusAlertaManutencao(alerta.status)}
      {alerta.status === "atrasado" &&
        ` há ${Math.abs(alerta.diasRestantes)} dia(s)`}
    </span>
  );
}

export function ManutencaoAlertas({
  itens,
  onAgendar,
}: {
  itens: ManutencaoCard[];
  onAgendar?: (prefill: ManutencaoPrefill) => void;
}) {
  const alertas = useMemo(() => montarAlertasManutencao(itens), [itens]);
  const resumo = useMemo(() => resumoAlertasManutencao(alertas), [alertas]);

  if (!alertas.length) return null;

  return (
    <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            Manutenções preventivas pendentes
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Alerta 1 dia antes e no dia previsto. Manutenções em atraso permanecem
            visíveis até registrar uma nova do mesmo tipo no veículo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {resumo.atrasados > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-800">
              {resumo.atrasados} em atraso
            </span>
          )}
          {resumo.hoje > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-900">
              {resumo.hoje} para hoje
            </span>
          )}
          {resumo.amanha > 0 && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-800 ring-1 ring-amber-200">
              {resumo.amanha} para amanhã
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {alertas.map((a) => (
          <div
            key={a.id}
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 shadow-sm",
              a.status === "atrasado"
                ? "border-red-200"
                : "border-amber-200"
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Wrench className="h-4 w-4 shrink-0 text-[#33388d]" />
                <p className="font-medium text-slate-900">{a.nome}</p>
                <StatusBadge alerta={a} />
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {a.veiculoPlaca ? `Veículo: ${a.veiculoPlaca}` : "Veículo não informado"}
                {" · "}
                Prevista:{" "}
                <span className="font-medium text-slate-800">{formatarDataBr(a.dataPrevista)}</span>
                {" · "}
                Última: {formatarDataBr(a.dataUltimaManutencao)}
              </p>
            </div>
            {onAgendar && (
              <Button
                type="button"
                variant="secondary"
                className="shrink-0 px-3 py-2 text-sm"
                onClick={() =>
                  onAgendar({
                    nome: a.nome,
                    veiculoId: a.veiculoId ?? undefined,
                    data: a.dataPrevista,
                  })
                }
              >
                <CalendarClock className="h-4 w-4" />
                Agendar
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
