"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  ChevronDown,
  CircleDollarSign,
  FileDown,
  Filter,
  Route,
  Truck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatsCards } from "@/components/frota/stats-cards";
import { matchPlaca } from "@/lib/cadastro-busca";
import { formatarDataBr, formatarMoeda } from "@/lib/frota-filters";
import { gerarPdfFaturamentoVeiculos } from "@/lib/veiculo-faturamento-pdf";
import {
  filtrarRelatorioPorVeiculos,
  montarRelatorioFaturamentoVeiculos,
  validarFiltrosFaturamento,
  type VeiculoFaturamentoFiltros,
  type VeiculoFaturamentoPeriodoModo,
  type VeiculoFaturamentoRelatorio,
  type VeiculoFaturamentoSecao,
} from "@/lib/veiculo-faturamento-relatorio";
import { VEICULO_TIPO_OPCOES, VINCULO_OPCOES, labelVinculo } from "@/lib/viagem-validation";
import { VIAGEM_STATUS_CORES, VIAGEM_STATUS_LABEL } from "@/lib/viagem-status";
import { cn, mebCard, mebFilterActive, mebFilterInactive, mebFormSection } from "@/lib/utils";
import type { RecursoVinculo, Veiculo } from "@/types";

const MESES = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

function anosDisponiveis() {
  const atual = new Date().getFullYear();
  return Array.from({ length: 8 }, (_, i) => {
    const ano = String(atual - i);
    return { value: ano, label: ano };
  });
}

function filtrosIniciais(): VeiculoFaturamentoFiltros {
  const hoje = new Date();
  return {
    periodoModo: "mes",
    mes: hoje.getMonth() + 1,
    ano: hoje.getFullYear(),
    dataDe: "",
    dataAte: "",
    vinculo: "",
    veiculoIds: null,
  };
}

function labelTipo(tipo: VeiculoFaturamentoSecao["tipo"]) {
  return VEICULO_TIPO_OPCOES.find((o) => o.value === tipo)?.label ?? tipo;
}

function labelStatus(status: string) {
  if (!status) return "—";
  return VIAGEM_STATUS_LABEL[status] ?? status;
}

export function FaturamentoDashboard() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [veiculosProntos, setVeiculosProntos] = useState(false);
  const [filtros, setFiltros] = useState<VeiculoFaturamentoFiltros>(filtrosIniciais);
  const [buscaPlaca, setBuscaPlaca] = useState("");
  const [relatorioBase, setRelatorioBase] = useState<VeiculoFaturamentoRelatorio | null>(null);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);

  const veiculosDoVinculo = useMemo(() => {
    const lista = filtros.vinculo
      ? veiculos.filter((v) => (v.vinculo ?? "frota") === filtros.vinculo)
      : veiculos;
    return [...lista].sort((a, b) => a.placa.localeCompare(b.placa, "pt-BR"));
  }, [veiculos, filtros.vinculo]);

  const veiculosVisiveis = useMemo(() => {
    const q = buscaPlaca.trim().toLowerCase();
    if (!q) return veiculosDoVinculo;
    return veiculosDoVinculo.filter(
      (v) => matchPlaca(v.placa, buscaPlaca) || v.nome.toLowerCase().includes(q)
    );
  }, [veiculosDoVinculo, buscaPlaca]);

  const relatorio = useMemo(() => {
    if (!relatorioBase) return null;
    return filtrarRelatorioPorVeiculos(relatorioBase, filtros.veiculoIds);
  }, [relatorioBase, filtros.veiculoIds]);

  const idsSelecionados = new Set(filtros.veiculoIds ?? []);
  const todosMarcados = filtros.veiculoIds == null;

  const loadVeiculos = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("veiculos").select("*").order("placa");
    setVeiculos((data as Veiculo[]) ?? []);
    setVeiculosProntos(true);
  }, []);

  const loadRelatorio = useCallback(async () => {
    if (!veiculosProntos) return;
    if (!veiculos.length) {
      setRelatorioBase(null);
      setLoading(false);
      return;
    }
    const invalido = validarFiltrosFaturamento({ ...filtros, veiculoIds: null });
    if (invalido) {
      setErro(invalido);
      setRelatorioBase(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErro("");
    try {
      const dados = await montarRelatorioFaturamentoVeiculos(veiculos, {
        ...filtros,
        veiculoIds: null,
      });
      setRelatorioBase(dados);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar o faturamento.");
      setRelatorioBase(null);
    } finally {
      setLoading(false);
    }
  }, [veiculos, veiculosProntos, filtros.periodoModo, filtros.mes, filtros.ano, filtros.dataDe, filtros.dataAte, filtros.vinculo]);

  useEffect(() => {
    loadVeiculos();
  }, [loadVeiculos]);

  useEffect(() => {
    loadRelatorio();
  }, [loadRelatorio]);

  function patch(parcial: Partial<VeiculoFaturamentoFiltros>) {
    setFiltros((atual) => ({ ...atual, ...parcial }));
    setErro("");
  }

  function toggleVeiculo(id: string) {
    setFiltros((atual) => {
      const base = atual.veiculoIds == null ? veiculosDoVinculo.map((v) => v.id) : [...atual.veiculoIds];
      const set = new Set(base);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      const proximo = [...set];
      return {
        ...atual,
        veiculoIds: proximo.length === veiculosDoVinculo.length ? null : proximo,
      };
    });
  }

  async function handlePdf() {
    if (!relatorio?.secoes.length) {
      setErro("Nenhum veículo no filtro para gerar o PDF.");
      return;
    }
    setGerando(true);
    try {
      gerarPdfFaturamentoVeiculos(relatorio);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar PDF.");
    } finally {
      setGerando(false);
    }
  }

  const secoesComFaturamento = relatorio?.secoes.filter((s) => s.viagens.length > 0) ?? [];
  const maxTotal = Math.max(...secoesComFaturamento.map((s) => s.totalBruto), 1);
  const ticketMedio =
    relatorio && relatorio.qtdViagensUnicas > 0
      ? relatorio.totalGeralUnico / relatorio.qtdViagensUnicas
      : 0;

  return (
    <div className="space-y-6">
      <section
        className={cn(
          mebCard,
          "relative overflow-hidden border-cyan-200/60 bg-gradient-to-br from-cyan-50 via-white to-indigo-50/80 p-6 shadow-sm"
        )}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-cyan-200/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-indigo-200/20 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <CircleDollarSign className="h-6 w-6 text-cyan-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
                Frota
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Faturamento</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              Frete bruto por veículo no período, com detalhe por cliente e viagem. Filtre por mês,
              frota própria, terceiro e placas.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={handlePdf} disabled={gerando || loading}>
            <FileDown className="h-4 w-4" />
            {gerando ? "Gerando..." : "Baixar PDF"}
          </Button>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl bg-[#33388d] px-6 py-6 text-white shadow-sm">
        <div className="pointer-events-none absolute -right-12 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-32 w-32 rounded-full bg-sky-300/20 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
              Faturamento bruto
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
              {loading || !relatorio ? "…" : formatarMoeda(relatorio.totalGeralUnico)}
            </p>
            <p className="mt-1 text-sm text-white/70">
              {relatorio?.periodoLabel ?? "Carregando período…"}
              {relatorio ? ` · ${relatorio.vinculoLabel}` : ""}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat
              label="Viagens"
              value={loading || !relatorio ? "…" : String(relatorio.qtdViagensUnicas)}
            />
            <MiniStat
              label="Ticket médio"
              value={loading || !relatorio ? "…" : formatarMoeda(ticketMedio)}
            />
          </div>
        </div>
      </section>

      <StatsCards
        stats={[
          {
            label: "Faturamento bruto",
            value: loading || !relatorio ? "…" : formatarMoeda(relatorio.totalGeralUnico),
            sub: "Sem ICMS, comissão ou encargos",
            icon: Banknote,
            tone: "emerald",
          },
          {
            label: "Viagens",
            value: loading || !relatorio ? "…" : relatorio.qtdViagensUnicas,
            sub: "Sem duplicar composição",
            icon: Route,
            tone: "cyan",
          },
          {
            label: "Veículos",
            value: loading || !relatorio ? "…" : secoesComFaturamento.length,
            sub: `${relatorio?.secoes.length ?? 0} no filtro`,
            icon: Truck,
            tone: "sky",
          },
          {
            label: "Ticket médio",
            value: loading || !relatorio ? "…" : formatarMoeda(ticketMedio),
            sub: "Bruto por viagem",
            icon: CircleDollarSign,
            tone: "violet",
          },
        ]}
      />

      <section className={cn(mebFormSection, "space-y-4")}>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Filter className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">Filtros</p>
            <p className="text-xs text-slate-500">Período, vínculo da frota e placas</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Período"
            value={filtros.periodoModo}
            onChange={(e) =>
              patch({ periodoModo: e.target.value as VeiculoFaturamentoPeriodoModo })
            }
            options={[
              { value: "mes", label: "Mês específico" },
              { value: "datas", label: "Datas específicas" },
              { value: "todos", label: "Todos os períodos" },
            ]}
            className="min-w-[11rem] h-10"
          />
          {filtros.periodoModo === "mes" && (
            <>
              <Select
                label="Mês"
                value={String(filtros.mes)}
                onChange={(e) => patch({ mes: Number(e.target.value) })}
                options={MESES}
                className="min-w-[10rem] h-10"
              />
              <Select
                label="Ano"
                value={String(filtros.ano)}
                onChange={(e) => patch({ ano: Number(e.target.value) })}
                options={anosDisponiveis()}
                className="min-w-[7rem] h-10"
              />
            </>
          )}
          {filtros.periodoModo === "datas" && (
            <>
              <Input
                label="De"
                type="date"
                value={filtros.dataDe}
                onChange={(e) => patch({ dataDe: e.target.value })}
              />
              <Input
                label="Até"
                type="date"
                value={filtros.dataAte}
                onChange={(e) => patch({ dataAte: e.target.value })}
              />
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "", label: "Todos" },
              ...VINCULO_OPCOES.map((o) => ({ value: o.value, label: o.label })),
            ] as const
          ).map((opcao) => (
            <button
              key={opcao.value || "todos"}
              type="button"
              onClick={() => patch({ vinculo: opcao.value as "" | RecursoVinculo, veiculoIds: null })}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium transition",
                filtros.vinculo === opcao.value
                  ? mebFilterActive
                  : cn(mebFilterInactive, "shadow-sm")
              )}
            >
              {opcao.label}
            </button>
          ))}
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-700">Placas</p>
            <div className="flex gap-3">
              <button
                type="button"
                className="text-xs font-semibold text-cyan-700 hover:underline"
                onClick={() => patch({ veiculoIds: null })}
              >
                Marcar todos
              </button>
              <button
                type="button"
                className="text-xs font-semibold text-slate-600 hover:underline"
                onClick={() => patch({ veiculoIds: [] })}
              >
                Limpar
              </button>
            </div>
          </div>
          <Input
            placeholder="Buscar placa ou nome..."
            value={buscaPlaca}
            onChange={(e) => setBuscaPlaca(e.target.value)}
          />
          <div className="mt-2 flex max-h-36 flex-wrap gap-2 overflow-y-auto">
            {veiculosVisiveis.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum veículo neste vínculo.</p>
            ) : (
              veiculosVisiveis.map((v) => {
                const marcado = todosMarcados || idsSelecionados.has(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => toggleVeiculo(v.id)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition",
                      marcado ? mebFilterActive : cn(mebFilterInactive, "shadow-sm")
                    )}
                  >
                    <span className="font-mono">{v.placa}</span>
                    <span className="ml-1.5 font-normal text-slate-500">{v.nome}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </section>

      {erro && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </p>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-200/60" />
          ))}
        </div>
      ) : filtros.veiculoIds != null && filtros.veiculoIds.length === 0 ? (
        <div className={cn(mebCard, "bg-white/90 p-10 text-center text-sm text-slate-500")}>
          Selecione ao menos uma placa para ver o faturamento.
        </div>
      ) : !relatorio || secoesComFaturamento.length === 0 ? (
        <div className={cn(mebCard, "bg-white/90 p-10 text-center text-sm text-slate-500")}>
          Nenhuma viagem com faturamento para os filtros selecionados.
        </div>
      ) : (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Por veículo</h2>
            <p className="text-sm text-slate-500">
              Clique no card para ver clientes e viagens. O total geral não duplica caminhão e
              carreta da mesma viagem.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {secoesComFaturamento.map((secao) => (
              <VeiculoFaturamentoCard
                key={secao.veiculoId}
                secao={secao}
                maxTotal={maxTotal}
                aberto={aberto === secao.veiculoId}
                onToggle={() =>
                  setAberto((atual) => (atual === secao.veiculoId ? null : secao.veiculoId))
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

function VeiculoFaturamentoCard({
  secao,
  maxTotal,
  aberto,
  onToggle,
}: {
  secao: VeiculoFaturamentoSecao;
  maxTotal: number;
  aberto: boolean;
  onToggle: () => void;
}) {
  const pct = Math.max(4, Math.round((secao.totalBruto / maxTotal) * 100));
  const clientesPreview = secao.porCliente.slice(0, 3);

  return (
    <article className={cn(mebCard, "border-l-4 border-l-emerald-500 bg-white/90 shadow-sm")}>
      <button type="button" onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-base font-bold text-slate-900">{secao.placa}</p>
            <p className="truncate text-sm text-slate-600">
              {secao.nome} · {labelTipo(secao.tipo)} · {labelVinculo(secao.vinculo)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="text-right">
              <p className="text-lg font-bold tabular-nums text-emerald-800">
                {formatarMoeda(secao.totalBruto)}
              </p>
              <p className="text-xs text-slate-500">
                {secao.viagens.length} viagem{secao.viagens.length === 1 ? "" : "ns"}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition",
                aberto && "rotate-180 text-slate-600"
              )}
            />
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
        </div>
        {!aberto && clientesPreview.length > 0 && (
          <ul className="mt-3 space-y-1">
            {clientesPreview.map((c) => (
              <li key={c.cliente} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-slate-600">{c.cliente}</span>
                <span className="shrink-0 font-semibold tabular-nums text-slate-800">
                  {formatarMoeda(c.total)}
                </span>
              </li>
            ))}
            {secao.porCliente.length > 3 && (
              <li className="text-[11px] text-slate-400">
                +{secao.porCliente.length - 3} cliente(s)
              </li>
            )}
          </ul>
        )}
      </button>

      {aberto && (
        <div className="space-y-4 border-t border-slate-100 px-4 pb-4 pt-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Por cliente
            </p>
            <ul className="space-y-1.5">
              {secao.porCliente.map((c) => (
                <li
                  key={c.cliente}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-sm"
                >
                  <span className="min-w-0 truncate text-slate-700">
                    {c.cliente}
                    <span className="ml-1 text-xs text-slate-400">
                      · {c.qtdViagens} viagem{c.qtdViagens === 1 ? "" : "ns"}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                    {formatarMoeda(c.total)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-2 font-medium">Saída</th>
                  <th className="pb-2 font-medium">CT-e</th>
                  <th className="pb-2 font-medium">Cliente</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Frete bruto</th>
                </tr>
              </thead>
              <tbody>
                {secao.viagens.map((v) => (
                  <tr key={v.viagemId} className="border-t border-slate-100">
                    <td className="py-2 text-slate-700">
                      {v.saidaEm ? formatarDataBr(v.saidaEm) : "—"}
                    </td>
                    <td className="py-2 font-mono text-slate-700">{v.numeroCte?.trim() || "—"}</td>
                    <td className="max-w-[10rem] truncate py-2 text-slate-700" title={v.cliente}>
                      {v.cliente}
                    </td>
                    <td className="py-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                          VIAGEM_STATUS_CORES[v.status] ?? "bg-slate-100 text-slate-600"
                        )}
                      >
                        {labelStatus(v.status)}
                      </span>
                    </td>
                    <td className="py-2 text-right font-semibold tabular-nums text-slate-900">
                      {formatarMoeda(v.valorFrete)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </article>
  );
}
