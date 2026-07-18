"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, FileDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CadastroOpcaoAutocomplete } from "@/components/ui/cadastro-opcao-autocomplete";
import { Button } from "@/components/ui/button";
import { MebModal, MebModalBody, MebModalFooter, MebModalHeader } from "@/components/ui/modal";
import {
  filtrarViagensAcompanhamentoRelatorio,
  listarPlacasAcompanhamento,
  nomesFornecedoresViagem,
  resolverPlacaRelatorioAcompanhamento,
  type AcompanhamentoRelatorioFiltros,
  type AcompanhamentoViagemItem,
} from "@/lib/acompanhamento-data";
import {
  ACOMPANHAMENTO_RELATORIO_COLUNAS,
  colunasRelatorioPadrao,
  gerarPdfAcompanhamentoRelatorio,
  type AcompanhamentoRelatorioColunaKey,
  type AcompanhamentoRelatorioColunasSelecionadas,
} from "@/lib/acompanhamento-relatorio-pdf";
import { PlacaRelatorioAutocomplete } from "@/components/operacional/placa-relatorio-autocomplete";
import type { ParceiroSugestao } from "@/lib/parceiros";
import { formatarDataBr, formatarMoeda } from "@/lib/frota-filters";
import { VIAGEM_STATUS_FILTRO_ACOMPANHAMENTO, VINCULO_OPCOES } from "@/lib/viagem-validation";
import { VIAGEM_STATUS_LABEL } from "@/lib/viagem-status";
import type { RecursoVinculo } from "@/types";
import { cn } from "@/lib/utils";

function padraoDatas() {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return {
    de: format(inicioMes, "yyyy-MM-dd"),
    ate: format(hoje, "yyyy-MM-dd"),
  };
}

type Etapa = "filtros" | "revisao";

function dataRefViagem(v: AcompanhamentoViagemItem) {
  return v.saida_em ?? v.created_at;
}

export function AcompanhamentoRelatorioModal({
  viagens,
  fornecedores,
  open,
  onClose,
}: {
  viagens: AcompanhamentoViagemItem[];
  fornecedores: ParceiroSugestao[];
  open: boolean;
  onClose: () => void;
}) {
  const [etapa, setEtapa] = useState<Etapa>("filtros");
  const [de, setDe] = useState(padraoDatas().de);
  const [ate, setAte] = useState(padraoDatas().ate);
  const [status, setStatus] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");
  const [vinculo, setVinculo] = useState<"" | RecursoVinculo>("");
  const [placa, setPlaca] = useState("");
  const [placaDigitada, setPlacaDigitada] = useState("");
  const [colunas, setColunas] = useState<AcompanhamentoRelatorioColunasSelecionadas>(
    colunasRelatorioPadrao
  );
  const [viagensPreview, setViagensPreview] = useState<AcompanhamentoViagemItem[]>([]);
  const [filtrosPreview, setFiltrosPreview] = useState<AcompanhamentoRelatorioFiltros | null>(
    null
  );
  /** IDs das viagens marcadas para ficar fora do PDF. */
  const [excluidas, setExcluidas] = useState<Set<string>>(() => new Set());
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);

  const placasRelatorio = useMemo(() => listarPlacasAcompanhamento(viagens), [viagens]);
  const qtdColunas = useMemo(
    () => ACOMPANHAMENTO_RELATORIO_COLUNAS.filter((c) => colunas[c.key]).length,
    [colunas]
  );

  const qtdIncluidas = useMemo(
    () => viagensPreview.filter((v) => !excluidas.has(v.id)).length,
    [viagensPreview, excluidas]
  );

  useEffect(() => {
    if (!open) {
      setEtapa("filtros");
      setViagensPreview([]);
      setFiltrosPreview(null);
      setExcluidas(new Set());
      setErro("");
      setGerando(false);
    }
  }, [open]);

  function toggleColuna(key: AcompanhamentoRelatorioColunaKey) {
    setColunas((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function marcarTodas(valor: boolean) {
    setColunas(
      Object.fromEntries(
        ACOMPANHAMENTO_RELATORIO_COLUNAS.map((c) => [c.key, valor])
      ) as AcompanhamentoRelatorioColunasSelecionadas
    );
  }

  function validarFiltros(): boolean {
    if (!de || !ate) {
      setErro("Informe a data inicial e a data final.");
      return false;
    }
    if (de > ate) {
      setErro("A data inicial não pode ser posterior à data final.");
      return false;
    }
    if (qtdColunas === 0) {
      setErro("Selecione ao menos um dado para aparecer no relatório.");
      return false;
    }
    setErro("");
    return true;
  }

  function montarFiltros(): AcompanhamentoRelatorioFiltros | null {
    const placaFiltro = placa.trim();
    if (placaDigitada.trim() && !placaFiltro) {
      setErro("Selecione uma placa de caminhão ou cavalo na lista de sugestões.");
      return null;
    }
    if (placaFiltro) {
      const placaValida = resolverPlacaRelatorioAcompanhamento(placasRelatorio, placaFiltro);
      if (!placaValida) {
        setErro("Placa inválida. Escolha um caminhão ou cavalo cadastrado nas viagens.");
        return null;
      }
    }

    const placaResolvida = placaFiltro
      ? resolverPlacaRelatorioAcompanhamento(placasRelatorio, placaFiltro) ?? ""
      : "";

    return {
      de,
      ate,
      status,
      fornecedorId,
      vinculo,
      placa: placaResolvida,
    };
  }

  function handleContinuar() {
    if (!validarFiltros()) return;
    const filtros = montarFiltros();
    if (!filtros) return;

    const fornecedorSelecionado = fornecedorId
      ? fornecedores.find((f) => f.id === fornecedorId)
      : null;
    const filtradas = filtrarViagensAcompanhamentoRelatorio(
      viagens,
      filtros,
      fornecedorSelecionado
    );
    if (!filtradas.length) {
      setErro("Nenhuma viagem encontrada para o período e filtros selecionados.");
      return;
    }

    setFiltrosPreview(filtros);
    setViagensPreview(filtradas);
    setExcluidas(new Set());
    setErro("");
    setEtapa("revisao");
  }

  function toggleExclusao(id: string) {
    setExcluidas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function marcarTodasViagens(incluir: boolean) {
    if (incluir) {
      setExcluidas(new Set());
    } else {
      setExcluidas(new Set(viagensPreview.map((v) => v.id)));
    }
  }

  async function handleGerar() {
    if (!filtrosPreview) return;
    const selecionadas = viagensPreview.filter((v) => !excluidas.has(v.id));
    if (!selecionadas.length) {
      setErro("Inclua ao menos uma viagem no relatório.");
      return;
    }

    setGerando(true);
    setErro("");
    try {
      await gerarPdfAcompanhamentoRelatorio(selecionadas, filtrosPreview, fornecedores, colunas);
      onClose();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar PDF.");
    } finally {
      setGerando(false);
    }
  }

  function handleVoltar() {
    setEtapa("filtros");
    setErro("");
  }

  return (
    <MebModal
      open={open}
      onClose={onClose}
      maxWidth={etapa === "revisao" ? "max-w-2xl" : "max-w-md"}
      aria-labelledby="acompanhamento-relatorio-titulo"
    >
      <div className="p-6">
        <MebModalHeader
          id="acompanhamento-relatorio-titulo"
          title="Relatório de Acompanhamento"
          description={
            etapa === "filtros"
              ? "Defina o período, os filtros e quais dados devem aparecer no PDF. O relatório considera apenas placas de caminhão e cavalo (carretas são ignoradas)."
              : "Desmarque as viagens que não devem entrar no PDF. As demais serão incluídas no relatório."
          }
          onClose={onClose}
        />

        <MebModalBody className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto">
          {etapa === "filtros" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="De"
                  type="date"
                  tone="light"
                  value={de}
                  onChange={(e) => setDe(e.target.value)}
                />
                <Input
                  label="Até"
                  type="date"
                  tone="light"
                  value={ate}
                  onChange={(e) => setAte(e.target.value)}
                />
              </div>

              <Select
                label="Status"
                tone="light"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: "", label: "Todos os status" },
                  ...VIAGEM_STATUS_FILTRO_ACOMPANHAMENTO.map((s) => ({
                    value: s,
                    label: VIAGEM_STATUS_LABEL[s] ?? s,
                  })),
                ]}
              />

              <CadastroOpcaoAutocomplete
                label="Fornecedor"
                options={fornecedores.map((f) => ({ value: f.id, label: f.nome }))}
                value={fornecedorId}
                onValueChange={setFornecedorId}
                opcional
                placeholder="Todos — digite o nome (mín. 2 letras)"
              />

              <PlacaRelatorioAutocomplete
                label="Placa do veículo"
                placas={placasRelatorio}
                value={placa}
                onChange={(p) => {
                  setPlaca(p);
                  setErro("");
                }}
                onTextoChange={setPlacaDigitada}
                hint="Deixe vazio para todas as placas (caminhão e cavalo). Digite ao menos 2 caracteres para ver sugestões."
              />

              <Select
                label="Vínculo"
                tone="light"
                value={vinculo}
                onChange={(e) => setVinculo(e.target.value as "" | RecursoVinculo)}
                options={[
                  { value: "", label: "Todos (frota e terceiro)" },
                  ...VINCULO_OPCOES.map((o) => ({ value: o.value, label: o.label })),
                ]}
              />

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Dados do relatório</p>
                    <p className="text-xs text-slate-600">
                      Marque o que deve aparecer no PDF ({qtdColunas} selecionado
                      {qtdColunas === 1 ? "" : "s"}).
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => marcarTodas(true)}
                      className="text-xs font-semibold text-cyan-700 hover:underline"
                    >
                      Marcar todos
                    </button>
                    <button
                      type="button"
                      onClick={() => marcarTodas(false)}
                      className="text-xs font-semibold text-slate-700 hover:underline"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ACOMPANHAMENTO_RELATORIO_COLUNAS.map((c) => (
                    <label
                      key={c.key}
                      className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-sm font-medium text-slate-900 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={colunas[c.key]}
                        onChange={() => toggleColuna(c.key)}
                        className="mt-0.5 rounded border-slate-400"
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-700">
                  {qtdIncluidas} de {viagensPreview.length} viagem
                  {viagensPreview.length === 1 ? "" : "ns"} no PDF
                  {excluidas.size > 0
                    ? ` · ${excluidas.size} fora`
                    : ""}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => marcarTodasViagens(true)}
                    className="text-xs font-semibold text-cyan-700 hover:underline"
                  >
                    Incluir todas
                  </button>
                  <button
                    type="button"
                    onClick={() => marcarTodasViagens(false)}
                    className="text-xs font-semibold text-slate-700 hover:underline"
                  >
                    Excluir todas
                  </button>
                </div>
              </div>

              <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
                {viagensPreview.map((v) => {
                  const fora = excluidas.has(v.id);
                  const destino =
                    v.entregas.map((e) => e.local_entrega).filter(Boolean).join(" · ") || "—";
                  const origem = nomesFornecedoresViagem(v, fornecedores);
                  const statusLabel = VIAGEM_STATUS_LABEL[v.status] ?? v.status;
                  return (
                    <li key={v.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer gap-3 px-3 py-2.5 transition-colors",
                          fora ? "bg-slate-50 opacity-60" : "hover:bg-slate-50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={!fora}
                          onChange={() => toggleExclusao(v.id)}
                          className="mt-1 shrink-0 rounded border-slate-400"
                        />
                        <span className="min-w-0 flex-1 space-y-0.5">
                          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm font-semibold text-slate-900">
                            <span>{formatarDataBr(dataRefViagem(v))}</span>
                            <span className="font-medium text-slate-600">·</span>
                            <span>{v.placas || "—"}</span>
                            {v.numero_cte ? (
                              <>
                                <span className="font-medium text-slate-600">·</span>
                                <span className="font-medium text-slate-700">
                                  CT-e {v.numero_cte}
                                </span>
                              </>
                            ) : null}
                          </span>
                          <span className="block text-xs text-slate-600">
                            {v.motorista_nome || "—"} · {statusLabel}
                            {v.valor_frete != null && v.valor_frete > 0
                              ? ` · ${formatarMoeda(v.valor_frete)}`
                              : ""}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {origem} → {destino}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {erro && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}
        </MebModalBody>

        <MebModalFooter className="mt-6">
          {etapa === "filtros" ? (
            <>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleContinuar}>
                Continuar
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={handleVoltar} disabled={gerando}>
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button type="button" onClick={handleGerar} disabled={gerando || qtdIncluidas === 0}>
                <FileDown className="h-4 w-4" />
                {gerando ? "Gerando..." : "Gerar PDF"}
              </Button>
            </>
          )}
        </MebModalFooter>
      </div>
    </MebModal>
  );
}
