"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  Car,
  Users,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DIAS_ALERTA_VENCIMENTO,
  montarAlertas,
  resumoAlertas,
  type AlertaDocumentacao,
} from "@/lib/documentacao-alertas";
import { formatarDataBr } from "@/lib/frota-filters";
import { cn, mebCard, mebCardSm, mebFilterActive, mebFilterInactive } from "@/lib/utils";
import type { Motorista, Veiculo } from "@/types";

type Filtro = "todos" | "motorista" | "veiculo";

function StatusBadge({ alerta }: { alerta: AlertaDocumentacao }) {
  const base = "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600";
  if (alerta.apenasContexto || alerta.status === "ok") {
    return (
      <span className={base}>
        Em dia
        {alerta.diasRestantes != null && ` (${alerta.diasRestantes} dias)`}
      </span>
    );
  }
  if (alerta.status === "vencido") {
    return (
      <span className={cn(base, "font-semibold text-slate-800")}>
        Vencido
        {alerta.diasRestantes != null &&
          ` há ${Math.abs(alerta.diasRestantes)} dia(s)`}
      </span>
    );
  }
  if (alerta.status === "vencendo") {
    return (
      <span className={cn(base, "font-semibold text-slate-700")}>
        Vence em {alerta.diasRestantes} dia(s)
      </span>
    );
  }
  return <span className={base}>Sem data cadastrada</span>;
}

export function DocumentacaoAvisos() {
  const [loading, setLoading] = useState(true);
  const [alertas, setAlertas] = useState<AlertaDocumentacao[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from("motoristas")
        .select(
          "id, nome_completo, cpf, vinculo, cnh_numero, cnh_vencimento, toxicologico_vencimento"
        )
        .order("nome_completo"),
      supabase
        .from("veiculos")
        .select(
          "id, nome, placa, vinculo, crlv_vencimento, ipva_vencimento, tacografo_vencimento"
        )
        .order("nome"),
    ]).then(([m, v]) => {
      setAlertas(
        montarAlertas(
          (m.data as Motorista[]) ?? [],
          (v.data as Veiculo[]) ?? []
        )
      );
      setLoading(false);
    });
  }, []);

  const resumo = useMemo(() => resumoAlertas(alertas), [alertas]);

  const filtrados = useMemo(() => {
    if (filtro === "todos") return alertas;
    return alertas.filter((a) => a.categoria === filtro);
  }, [alertas, filtro]);

  if (loading) {
    return <p className="text-slate-500">Carregando avisos...</p>;
  }

  return (
    <div className="space-y-6">
      <p className={cn(mebCardSm, "px-4 py-3 text-sm text-slate-600")}>
        Documentos vencidos, a vencer nos próximos{" "}
        <strong className="font-semibold text-slate-800">
          {DIAS_ALERTA_VENCIMENTO} dias
        </strong>{" "}
        ou sem data no cadastro. Quando há aviso em um motorista ou veículo, os
        demais documentos dele aparecem listados como em dia. Atualize em Cadastro
        → Motoristas ou Veículos.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ResumoCard label="Total de avisos" value={resumo.total} icon={AlertTriangle} />
        <ResumoCard label="Vencidos" value={resumo.vencidos} icon={AlertTriangle} />
        <ResumoCard
          label="Vencendo em breve"
          value={resumo.vencendo}
          icon={CalendarClock}
        />
        <ResumoCard label="Sem data" value={resumo.semData} icon={HelpCircle} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "todos" as const, label: "Todos", count: resumo.total },
            {
              id: "motorista" as const,
              label: "Motoristas",
              count: resumo.motoristas,
              icon: Users,
            },
            {
              id: "veiculo" as const,
              label: "Veículos",
              count: resumo.veiculos,
              icon: Car,
            },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltro(f.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
              filtro === f.id ? mebFilterActive : cn(mebFilterInactive, "shadow-sm")
            )}
          >
            {"icon" in f && f.icon && <f.icon className="h-4 w-4" />}
            {f.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-xs",
                filtro === f.id
                  ? "bg-emerald-200/60 text-emerald-900"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className={cn(mebCard, "p-10 text-center")}>
          <p className="font-medium text-slate-800">Nenhum aviso no momento</p>
          <p className="mt-1 text-sm text-slate-500">
            Todos os documentos monitorados estão em dia no período de alerta.
          </p>
        </div>
      ) : (
        <div className={cn(mebCard, "overflow-x-auto")}>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-slate-100 transition hover:bg-white/50"
                >
                  <td className="px-4 py-3">
                    {a.categoria === "motorista" ? (
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Users className="h-4 w-4" />
                        Motorista
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Car className="h-4 w-4" />
                        Veículo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{a.entidadeNome}</p>
                    {a.entidadeDetalhe && (
                      <p className="text-xs text-slate-500">{a.entidadeDetalhe}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{a.documento}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {a.dataVencimento ? formatarDataBr(a.dataVencimento) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge alerta={a} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={a.href}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      Cadastro
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ResumoCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className={cn(mebCard, "p-4")}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
