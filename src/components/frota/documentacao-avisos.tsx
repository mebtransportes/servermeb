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
import { cn } from "@/lib/utils";
import type { Motorista, Veiculo } from "@/types";

type Filtro = "todos" | "motorista" | "veiculo";

function StatusBadge({ alerta }: { alerta: AlertaDocumentacao }) {
  if (alerta.apenasContexto || alerta.status === "ok") {
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
        Em dia
        {alerta.diasRestantes != null && ` (${alerta.diasRestantes} dias)`}
      </span>
    );
  }
  if (alerta.status === "vencido") {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
        Vencido
        {alerta.diasRestantes != null &&
          ` há ${Math.abs(alerta.diasRestantes)} dia(s)`}
      </span>
    );
  }
  if (alerta.status === "vencendo") {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
        Vence em {alerta.diasRestantes} dia(s)
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
      Sem data cadastrada
    </span>
  );
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
    return <p className="text-slate-600">Carregando avisos...</p>;
  }

  return (
    <div className="space-y-6">
      <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        Documentos vencidos, a vencer nos próximos{" "}
        <strong className="text-[#33388d]">{DIAS_ALERTA_VENCIMENTO} dias</strong> ou
        sem data no cadastro. Quando há aviso em um motorista ou veículo, os demais
        documentos dele aparecem em{" "}
        <span className="font-medium text-emerald-700">verde (em dia)</span>.
        Atualize em Cadastro → Motoristas ou Veículos.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ResumoCard
          label="Total de avisos"
          value={resumo.total}
          icon={AlertTriangle}
          tone="cyan"
        />
        <ResumoCard
          label="Vencidos"
          value={resumo.vencidos}
          icon={AlertTriangle}
          tone="red"
        />
        <ResumoCard
          label="Vencendo em breve"
          value={resumo.vencendo}
          icon={CalendarClock}
          tone="amber"
        />
        <ResumoCard
          label="Sem data"
          value={resumo.semData}
          icon={HelpCircle}
          tone="slate"
        />
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
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition shadow-sm",
              filtro === f.id
                ? "border-[#33388d] bg-[#33388d] text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            {"icon" in f && f.icon && <f.icon className="h-4 w-4" />}
            {f.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-xs",
                filtro === f.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              )}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-10 text-center shadow-sm">
          <p className="font-medium text-emerald-800">Nenhum aviso no momento</p>
          <p className="mt-1 text-sm text-emerald-700/80">
            Todos os documentos monitorados estão em dia no período de alerta.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
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
                  className={cn(
                    "border-b border-slate-100 transition hover:bg-slate-50",
                    a.apenasContexto && "bg-slate-50/80",
                    a.status === "vencido" && !a.apenasContexto && "bg-red-50",
                    a.status === "vencendo" && !a.apenasContexto && "bg-amber-50"
                  )}
                >
                  <td className="px-4 py-3">
                    {a.categoria === "motorista" ? (
                      <span className="flex items-center gap-1.5 font-medium text-[#33388d]">
                        <Users className="h-4 w-4" />
                        Motorista
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-medium text-violet-700">
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
                  <td className="px-4 py-3 text-slate-700">{a.documento}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {a.dataVencimento ? formatarDataBr(a.dataVencimento) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge alerta={a} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={a.href}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#33388d] hover:underline"
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
  tone,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  tone: "cyan" | "red" | "amber" | "slate";
}) {
  const tones = {
    cyan: "border-cyan-200 bg-white text-cyan-800",
    red: "border-red-200 bg-white text-red-800",
    amber: "border-amber-200 bg-white text-amber-900",
    slate: "border-slate-200 bg-white text-slate-700",
  };
  const iconTones = {
    cyan: "text-cyan-600",
    red: "text-red-500",
    amber: "text-amber-600",
    slate: "text-slate-500",
  };
  return (
    <div className={cn("rounded-xl border p-4 shadow-sm", tones[tone])}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <Icon className={cn("h-4 w-4", iconTones[tone])} />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
