"use client";

import { CustosEmpresariaisChart } from "@/components/financeiro/custos-empresariais-chart";
import { CustosEmpresariaisCadastroModal } from "@/components/financeiro/custos-empresariais-cadastro-modal";
import { CustosEmpresariaisDetalheModal } from "@/components/financeiro/custos-empresariais-detalhe-modal";
import { PeriodoFilter } from "@/components/frota/periodo-filter";
import { Button } from "@/components/ui/button";
import { MotoristaAutocomplete } from "@/components/ui/motorista-autocomplete";
import {
  excluirDespesaEmpresarial,
  fetchCustosEmpresariaisResumo,
  fetchGraficoMensalEmpresarial,
  type CustosEmpresariaisResumo,
  type PontoGraficoEmpresarial,
} from "@/lib/custos-empresariais";
import { fetchMotoristasOptions } from "@/lib/fechamento-data";
import {
  formatarDataBr,
  formatarMoeda,
  labelPeriodoConfig,
  PERIODO_FILTRO_INICIAL,
  type PeriodoFiltroState,
} from "@/lib/frota-filters";
import { mebAlert, mebConfirm } from "@/lib/meb-dialog";
import { cn, mebCard } from "@/lib/utils";
import type { DespesaEmpresarial } from "@/types/custos-empresariais";
import {
  Building2,
  Calculator,
  ChevronRight,
  FileText,
  Fuel,
  Plus,
  Sparkles,
  Trash2,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

type ModalDetalhe =
  | "motorista"
  | "manutencao"
  | "abastecimento"
  | "escritorio"
  | "limpeza"
  | "contabilidade"
  | null;

type Tone = "emerald" | "amber" | "sky" | "slate" | "cyan" | "violet";

const TONES: Record<
  Tone,
  { accent: string; iconWrap: string; icon: string; value: string }
> = {
  emerald: {
    accent: "border-l-emerald-500",
    iconWrap: "bg-emerald-100",
    icon: "text-emerald-600",
    value: "text-emerald-800",
  },
  amber: {
    accent: "border-l-amber-500",
    iconWrap: "bg-amber-100",
    icon: "text-amber-600",
    value: "text-amber-800",
  },
  sky: {
    accent: "border-l-sky-500",
    iconWrap: "bg-sky-100",
    icon: "text-sky-600",
    value: "text-sky-800",
  },
  slate: {
    accent: "border-l-slate-400",
    iconWrap: "bg-slate-100",
    icon: "text-slate-600",
    value: "text-slate-800",
  },
  cyan: {
    accent: "border-l-cyan-500",
    iconWrap: "bg-cyan-100",
    icon: "text-cyan-600",
    value: "text-cyan-800",
  },
  violet: {
    accent: "border-l-violet-500",
    iconWrap: "bg-violet-100",
    icon: "text-violet-600",
    value: "text-violet-800",
  },
};

function CardEmpresarial({
  label,
  valor,
  icon: Icon,
  tone,
  sub,
  onDetalhe,
  children,
  despesas,
  onExcluirDespesa,
}: {
  label: string;
  valor: number;
  icon: LucideIcon;
  tone: Tone;
  sub?: string;
  onDetalhe: () => void;
  children?: ReactNode;
  despesas?: DespesaEmpresarial[];
  onExcluirDespesa?: (id: string) => Promise<string | null>;
}) {
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const style = TONES[tone];

  async function handleExcluirCard(id: string) {
    if (!onExcluirDespesa) return;
    if (
      !(await mebConfirm("Excluir este lançamento?", {
        variant: "danger",
        confirmLabel: "Excluir",
      }))
    ) {
      return;
    }
    setExcluindoId(id);
    const err = await onExcluirDespesa(id);
    setExcluindoId(null);
    if (err) await mebAlert(err);
  }

  return (
    <article
      className={cn(
        mebCard,
        "flex flex-col border-l-4 bg-white/90 p-4 shadow-sm",
        style.accent
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            style.iconWrap
          )}
        >
          <Icon className={cn("h-5 w-5", style.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p
            className={cn(
              "mt-0.5 text-2xl font-bold tracking-tight tabular-nums",
              style.value
            )}
          >
            {formatarMoeda(valor)}
          </p>
          {sub && <p className="mt-1 text-[11px] leading-snug text-slate-500">{sub}</p>}
        </div>
      </div>

      {children && <div className="mt-3">{children}</div>}

      {despesas && despesas.length > 0 && onExcluirDespesa && (
        <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto border-t border-slate-200/80 pt-3">
          {despesas.slice(0, 5).map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-1.5 text-xs"
            >
              <div className="min-w-0 truncate">
                <span className="font-medium text-slate-700">{d.nome_item}</span>
                <span className="ml-1 text-slate-500">
                  · {formatarDataBr(d.data_despesa)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="font-semibold tabular-nums text-slate-800">
                  {formatarMoeda(Number(d.valor))}
                </span>
                <button
                  type="button"
                  title="Excluir"
                  disabled={excluindoId === d.id}
                  onClick={() => handleExcluirCard(d.id)}
                  className="rounded-md p-1 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
          {despesas.length > 5 && (
            <li className="text-center text-[11px] text-slate-500">
              +{despesas.length - 5} no detalhado
            </li>
          )}
        </ul>
      )}

      <button
        type="button"
        onClick={onDetalhe}
        className="mt-3 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
      >
        Ver detalhado
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </article>
  );
}

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">{titulo}</h2>
        {descricao && <p className="text-xs text-slate-500">{descricao}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

export default function CustosEmpresariaisPage() {
  const [periodo, setPeriodo] = useState<PeriodoFiltroState>(PERIODO_FILTRO_INICIAL);
  const [motoristaId, setMotoristaId] = useState("");
  const [motoristas, setMotoristas] = useState<{ id: string; nome_completo: string }[]>([]);
  const [resumo, setResumo] = useState<CustosEmpresariaisResumo | null>(null);
  const [grafico, setGrafico] = useState<PontoGraficoEmpresarial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCadastro, setShowCadastro] = useState(false);
  const [modalDetalhe, setModalDetalhe] = useState<ModalDetalhe>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, g, m] = await Promise.all([
      fetchCustosEmpresariaisResumo(periodo, motoristaId || undefined),
      fetchGraficoMensalEmpresarial(),
      fetchMotoristasOptions(),
    ]);
    setResumo(r);
    setGrafico(g);
    setMotoristas(m);
    setLoading(false);
  }, [periodo, motoristaId]);

  useEffect(() => {
    load();
  }, [load]);

  const periodoLabel = labelPeriodoConfig(periodo);

  async function handleExcluirDespesa(id: string): Promise<string | null> {
    const err = await excluirDespesaEmpresarial(id);
    if (!err) await load();
    return err;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Custos Empresariais
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Comissões, frota e despesas administrativas · {periodoLabel}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <PeriodoFilter value={periodo} onChange={setPeriodo} />
          <Button variant="success" onClick={() => setShowCadastro(true)}>
            <Plus className="h-4 w-4" />
            Cadastrar despesa
          </Button>
        </div>
      </header>

      {loading ? (
        <div className={cn(mebCard, "p-10 text-center text-sm text-slate-500")}>
          Carregando custos empresariais...
        </div>
      ) : resumo ? (
        <>
          <section className="relative overflow-hidden rounded-2xl bg-emerald-700 px-6 py-6 text-white shadow-sm">
            <div className="pointer-events-none absolute -right-12 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-16 left-1/3 h-32 w-32 rounded-full bg-emerald-300/25 blur-2xl" />
            <div className="relative flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                  Total empresarial
                </p>
                <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
                  {formatarMoeda(resumo.total)}
                </p>
                <p className="mt-1 text-sm text-white/75">{periodoLabel}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MiniStat
                  label="Motoristas"
                  value={formatarMoeda(resumo.pagamentoMotoristas)}
                />
                <MiniStat
                  label="Manutenções"
                  value={formatarMoeda(resumo.manutencoes)}
                />
                <MiniStat
                  label="Abastecimentos"
                  value={formatarMoeda(resumo.abastecimentos)}
                  className="col-span-2 sm:col-span-1"
                />
              </div>
            </div>
          </section>

          <CustosEmpresariaisChart dados={grafico} />

          <Secao
            titulo="Operação e frota"
            descricao="Comissões, manutenções e abastecimentos no período"
          >
            <CardEmpresarial
              label="Pagamento de Motoristas"
              valor={resumo.pagamentoMotoristas}
              icon={Users}
              tone="emerald"
              sub="Comissão final (fechamentos de viagens)"
              onDetalhe={() => setModalDetalhe("motorista")}
            >
              <MotoristaAutocomplete
                label="Motorista"
                motoristas={motoristas}
                motoristaId={motoristaId}
                onMotoristaIdChange={setMotoristaId}
                opcional
                placeholder="Todos os motoristas — digite para filtrar"
                hint="Deixe em branco para todos ou digite ao menos 3 letras do nome."
              />
            </CardEmpresarial>

            <CardEmpresarial
              label="Custos de Manutenções"
              valor={resumo.manutencoes}
              icon={Wrench}
              tone="amber"
              sub="Preventivas + manutenção em viagens"
              onDetalhe={() => setModalDetalhe("manutencao")}
            />

            <CardEmpresarial
              label="Custos em Abastecimentos"
              valor={resumo.abastecimentos}
              icon={Fuel}
              tone="sky"
              sub="Frota e viagens"
              onDetalhe={() => setModalDetalhe("abastecimento")}
            />
          </Secao>

          <Secao
            titulo="Despesas administrativas"
            descricao="Lançamentos cadastrados manualmente"
          >
            <CardEmpresarial
              label="Materiais de Escritório"
              valor={resumo.escritorio}
              icon={FileText}
              tone="slate"
              despesas={resumo.despesasEscritorio}
              onExcluirDespesa={handleExcluirDespesa}
              onDetalhe={() => setModalDetalhe("escritorio")}
            />

            <CardEmpresarial
              label="Materiais de Limpeza"
              valor={resumo.limpeza}
              icon={Sparkles}
              tone="cyan"
              despesas={resumo.despesasLimpeza}
              onExcluirDespesa={handleExcluirDespesa}
              onDetalhe={() => setModalDetalhe("limpeza")}
            />

            <CardEmpresarial
              label="Contabilidade e Sistemas"
              valor={resumo.contabilidade}
              icon={Calculator}
              tone="violet"
              despesas={resumo.despesasContabilidade}
              onExcluirDespesa={handleExcluirDespesa}
              onDetalhe={() => setModalDetalhe("contabilidade")}
            />
          </Secao>
        </>
      ) : null}

      <CustosEmpresariaisCadastroModal
        open={showCadastro}
        onClose={() => setShowCadastro(false)}
        onSaved={load}
      />

      {modalDetalhe && resumo && (
        <CustosEmpresariaisDetalheModal
          titulo={
            modalDetalhe === "motorista"
              ? "Pagamento de Motoristas"
              : modalDetalhe === "manutencao"
                ? "Custos de Manutenções"
                : modalDetalhe === "abastecimento"
                  ? "Custos em Abastecimentos"
                  : modalDetalhe === "escritorio"
                    ? "Materiais de Escritório"
                    : modalDetalhe === "limpeza"
                      ? "Materiais de Limpeza"
                      : "Contabilidade e Sistemas"
          }
          total={
            modalDetalhe === "motorista"
              ? resumo.pagamentoMotoristas
              : modalDetalhe === "manutencao"
                ? resumo.manutencoes
                : modalDetalhe === "abastecimento"
                  ? resumo.abastecimentos
                  : modalDetalhe === "escritorio"
                    ? resumo.escritorio
                    : modalDetalhe === "limpeza"
                      ? resumo.limpeza
                      : resumo.contabilidade
          }
          linhas={
            modalDetalhe === "motorista"
              ? resumo.detalheMotorista
              : modalDetalhe === "manutencao"
                ? resumo.detalheManutencaoItens
                : modalDetalhe === "abastecimento"
                  ? resumo.detalheAbastecimentoItens
                  : undefined
          }
          despesas={
            modalDetalhe === "escritorio"
              ? resumo.despesasEscritorio
              : modalDetalhe === "limpeza"
                ? resumo.despesasLimpeza
                : modalDetalhe === "contabilidade"
                  ? resumo.despesasContabilidade
                  : undefined
          }
          onClose={() => setModalDetalhe(null)}
          onExcluirDespesa={
            ["escritorio", "limpeza", "contabilidade"].includes(modalDetalhe)
              ? handleExcluirDespesa
              : undefined
          }
        />
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm",
        className
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-white/70">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
