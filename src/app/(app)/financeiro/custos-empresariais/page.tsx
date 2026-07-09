"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import {
  Building2,
  Plus,
  Users,
  Wrench,
  Fuel,
  FileText,
  Sparkles,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotoristaAutocomplete } from "@/components/ui/motorista-autocomplete";
import { PeriodoFilter } from "@/components/frota/periodo-filter";
import { CustosEmpresariaisChart } from "@/components/financeiro/custos-empresariais-chart";
import { CustosEmpresariaisCadastroModal } from "@/components/financeiro/custos-empresariais-cadastro-modal";
import { CustosEmpresariaisDetalheModal } from "@/components/financeiro/custos-empresariais-detalhe-modal";
import {
  fetchCustosEmpresariaisResumo,
  fetchGraficoMensalEmpresarial,
  excluirDespesaEmpresarial,
  type CustosEmpresariaisResumo,
  type PontoGraficoEmpresarial,
} from "@/lib/custos-empresariais";
import { fetchMotoristasOptions } from "@/lib/fechamento-data";
import {
  formatarMoeda,
  formatarDataBr,
  labelPeriodoConfig,
  PERIODO_FILTRO_INICIAL,
  type PeriodoFiltroState,
} from "@/lib/frota-filters";
import type { DespesaEmpresarial } from "@/types/custos-empresariais";
import { Trash2 } from "lucide-react";
import { mebAlert, mebConfirm } from "@/lib/meb-dialog";
import { cn, mebCard, mebFormSection } from "@/lib/utils";

type ModalDetalhe =
  | "motorista"
  | "manutencao"
  | "abastecimento"
  | "escritorio"
  | "limpeza"
  | "contabilidade"
  | null;

function CardEmpresarial({
  label,
  valor,
  icon: Icon,
  sub,
  onDetalhe,
  children,
  despesas,
  onExcluirDespesa,
}: {
  label: string;
  valor: number;
  icon: ComponentType<{ className?: string }>;
  sub?: string;
  onDetalhe: () => void;
  children?: React.ReactNode;
  despesas?: DespesaEmpresarial[];
  onExcluirDespesa?: (id: string) => Promise<string | null>;
}) {
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

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
    <article className={cn(mebCard, "flex flex-col p-4")}>
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        <Icon className="h-5 w-5 text-purple-600" />
        <span className="text-sm font-medium text-slate-600">{label}</span>
      </div>
      {children}
      <p className="text-2xl font-bold text-slate-900">{formatarMoeda(valor)}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
      {despesas && despesas.length > 0 && onExcluirDespesa && (
        <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto border-t border-slate-200/80 pt-3">
          {despesas.slice(0, 5).map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs"
            >
              <div className="min-w-0 truncate">
                <span className="text-slate-700">{d.nome_item}</span>
                <span className="ml-1 text-slate-500">
                  · {formatarDataBr(d.data_despesa)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-purple-700">{formatarMoeda(Number(d.valor))}</span>
                <button
                  type="button"
                  title="Excluir"
                  disabled={excluindoId === d.id}
                  onClick={() => handleExcluirCard(d.id)}
                  className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
          {despesas.length > 5 && (
            <li className="text-center text-xs text-slate-500">
              +{despesas.length - 5} no detalhado
            </li>
          )}
        </ul>
      )}
      <Button type="button" variant="secondary" className="mt-3 w-full" onClick={onDetalhe}>
        Ver detalhado
      </Button>
    </article>
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
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Custos Empresariais</h1>
            <p className="text-slate-500">Período: {periodoLabel}</p>
          </div>
        </div>
        <Button variant="success" onClick={() => setShowCadastro(true)}>
          <Plus className="h-4 w-4" />
          Cadastrar despesa
        </Button>
      </header>

      <div className={mebFormSection}>
        <label className="mb-2 block text-xs font-medium text-slate-500">Filtrar por período</label>
        <PeriodoFilter value={periodo} onChange={setPeriodo} />
      </div>

      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : resumo ? (
        <>
          <CustosEmpresariaisChart dados={grafico} />

          <article className={cn(mebCard, "border-purple-200/80 p-5 text-center")}>
            <p className="text-sm text-slate-500">Total empresarial no período</p>
            <p className="text-3xl font-bold text-purple-700">{formatarMoeda(resumo.total)}</p>
          </article>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <CardEmpresarial
              label="Pagamento de Motoristas"
              valor={resumo.pagamentoMotoristas}
              icon={Users}
              sub="Comissão final (fechamentos de viagens)"
              onDetalhe={() => setModalDetalhe("motorista")}
            >
              <div className="mb-3">
                <MotoristaAutocomplete
                  label="Motorista"
                  motoristas={motoristas}
                  motoristaId={motoristaId}
                  onMotoristaIdChange={setMotoristaId}
                  opcional
                  placeholder="Todos os motoristas — digite para filtrar"
                  hint="Deixe em branco para todos ou digite ao menos 3 letras do nome."
                />
              </div>
            </CardEmpresarial>

            <CardEmpresarial
              label="Custos de Manutenções"
              valor={resumo.manutencoes}
              icon={Wrench}
              sub="Preventivas + manutenção em viagens"
              onDetalhe={() => setModalDetalhe("manutencao")}
            />

            <CardEmpresarial
              label="Custos em Abastecimentos"
              valor={resumo.abastecimentos}
              icon={Fuel}
              sub="Frota e viagens"
              onDetalhe={() => setModalDetalhe("abastecimento")}
            />

            <CardEmpresarial
              label="Materiais de Escritório"
              valor={resumo.escritorio}
              icon={FileText}
              despesas={resumo.despesasEscritorio}
              onExcluirDespesa={handleExcluirDespesa}
              onDetalhe={() => setModalDetalhe("escritorio")}
            />

            <CardEmpresarial
              label="Materiais de Limpeza"
              valor={resumo.limpeza}
              icon={Sparkles}
              despesas={resumo.despesasLimpeza}
              onExcluirDespesa={handleExcluirDespesa}
              onDetalhe={() => setModalDetalhe("limpeza")}
            />

            <CardEmpresarial
              label="Contabilidade e Sistemas"
              valor={resumo.contabilidade}
              icon={Calculator}
              despesas={resumo.despesasContabilidade}
              onExcluirDespesa={handleExcluirDespesa}
              onDetalhe={() => setModalDetalhe("contabilidade")}
            />
          </div>
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
