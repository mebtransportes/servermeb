"use client";

import Link from "next/link";
import { CreditCard, Wallet } from "lucide-react";
import { formatarMoeda, formatarDataBr } from "@/lib/frota-filters";
import {
  labelStatusParcelaManutencao,
  resumoAvisosParcelasManutencao,
  type AvisoParcelaManutencao,
} from "@/lib/manutencao-parcelas-avisos";
import { cn, mebCard, mebCardSm } from "@/lib/utils";

function StatusBadge({ status }: { status: AvisoParcelaManutencao["status"] }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "hoje"
          ? "bg-amber-100 text-amber-900"
          : "bg-sky-100 text-sky-900"
      )}
    >
      {labelStatusParcelaManutencao(status)}
    </span>
  );
}

export function ParcelasManutencaoAvisos({ avisos }: { avisos: AvisoParcelaManutencao[] }) {
  const resumo = resumoAvisosParcelasManutencao(avisos);

  if (!avisos.length) return null;

  return (
    <section className={cn(mebCard, "space-y-4 border-amber-200/80 bg-amber-50/30 p-4")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Wallet className="h-4 w-4 text-amber-600" />
            Parcelas de manutenção a vencer
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Manutenções parceladas com vencimento hoje ou amanhã.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {resumo.hoje > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-900">
              {resumo.hoje} hoje
            </span>
          )}
          {resumo.amanha > 0 && (
            <span className="rounded-full bg-sky-100 px-2.5 py-1 font-medium text-sky-900">
              {resumo.amanha} amanhã
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {avisos.map((a) => (
          <div
            key={a.id}
            className={cn(
              mebCardSm,
              "flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3"
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CreditCard className="h-4 w-4 shrink-0 text-slate-400" />
                <p className="font-medium text-slate-900">{a.nome}</p>
                <StatusBadge status={a.status} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Parcela {a.parcelaNumero} · {formatarMoeda(a.parcelaValor)}
                {" · "}
                Vencimento:{" "}
                <span className="text-slate-700">{formatarDataBr(a.dataVencimento)}</span>
                {a.veiculoPlaca && (
                  <>
                    {" · "}
                    Veículo: {a.veiculoPlaca}
                  </>
                )}
              </p>
            </div>
            <Link
              href={`/frota/manutencao?edit=${encodeURIComponent(a.manutencaoCardId)}`}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
            >
              Ver manutenção
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
