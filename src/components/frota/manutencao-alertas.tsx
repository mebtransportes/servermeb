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
import { cn, mebCard, mebCardSm } from "@/lib/utils";
import type { ManutencaoCard } from "@/types/frota";

export type ManutencaoPrefill = {
  nome?: string;
  veiculoId?: string;
  data?: string;
};

function StatusBadge({ alerta }: { alerta: AlertaManutencaoPreventiva }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
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
    <div className={cn(mebCard, "space-y-4 p-4")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <AlertTriangle className="h-4 w-4 text-slate-500" />
            Manutenções preventivas pendentes
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Alerta 1 dia antes e no dia previsto. Manutenções em atraso permanecem
            visíveis até registrar uma nova do mesmo tipo no veículo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {resumo.atrasados > 0 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
              {resumo.atrasados} em atraso
            </span>
          )}
          {resumo.hoje > 0 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
              {resumo.hoje} para hoje
            </span>
          )}
          {resumo.amanha > 0 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
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
              mebCardSm,
              "flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Wrench className="h-4 w-4 shrink-0 text-slate-400" />
                <p className="font-medium text-slate-900">{a.nome}</p>
                <StatusBadge alerta={a} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {a.veiculoPlaca ? `Veículo: ${a.veiculoPlaca}` : "Veículo não informado"}
                {" · "}
                Prevista:{" "}
                <span className="text-slate-700">{formatarDataBr(a.dataPrevista)}</span>
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
