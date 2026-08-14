"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MebModal, MebModalBody, MebModalFooter, MebModalHeader } from "@/components/ui/modal";
import { matchPlaca } from "@/lib/cadastro-busca";
import { gerarPdfFaturamentoVeiculos } from "@/lib/veiculo-faturamento-pdf";
import {
  montarRelatorioFaturamentoVeiculos,
  validarFiltrosFaturamento,
  type VeiculoFaturamentoFiltros,
  type VeiculoFaturamentoPeriodoModo,
} from "@/lib/veiculo-faturamento-relatorio";
import { VINCULO_OPCOES, labelVinculo } from "@/lib/viagem-validation";
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

export function VeiculosFaturamentoRelatorioModal({
  open,
  onClose,
  veiculos,
}: {
  open: boolean;
  onClose: () => void;
  veiculos: Veiculo[];
}) {
  const [filtros, setFiltros] = useState<VeiculoFaturamentoFiltros>(filtrosIniciais);
  const [buscaPlaca, setBuscaPlaca] = useState("");
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFiltros(filtrosIniciais());
    setBuscaPlaca("");
    setErro("");
  }, [open]);

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

  const idsSelecionados = new Set(filtros.veiculoIds ?? []);
  const todosMarcados = filtros.veiculoIds == null;
  const qtdSelecionados = todosMarcados
    ? veiculosDoVinculo.length
    : filtros.veiculoIds?.length ?? 0;

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
    setErro("");
  }

  function marcarTodos(marcar: boolean) {
    patch({ veiculoIds: marcar ? null : [] });
  }

  async function handleGerar() {
    const invalido = validarFiltrosFaturamento(filtros);
    if (invalido) {
      setErro(invalido);
      return;
    }
    if (!veiculosDoVinculo.length) {
      setErro("Nenhum veículo cadastrado para o vínculo selecionado.");
      return;
    }
    if (filtros.veiculoIds != null && filtros.veiculoIds.length === 0) {
      setErro("Selecione ao menos um veículo.");
      return;
    }

    setGerando(true);
    try {
      const relatorio = await montarRelatorioFaturamentoVeiculos(veiculos, filtros);
      if (!relatorio.secoes.length) {
        setErro("Nenhum veículo encontrado para os filtros selecionados.");
        return;
      }
      gerarPdfFaturamentoVeiculos(relatorio);
      onClose();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar PDF.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <MebModal
      open={open}
      onClose={onClose}
      maxWidth="max-w-xl"
      aria-labelledby="veiculos-faturamento-relatorio-titulo"
    >
      <div className="p-6">
        <MebModalHeader
          id="veiculos-faturamento-relatorio-titulo"
          title="Relatório de faturamento por veículo"
          description="Filtre por mês, vínculo (frota própria ou terceiro) e placas. O PDF mostra o frete bruto de cada viagem, o total por cliente e o total de cada caminhão."
          onClose={onClose}
        />

        <MebModalBody className="mt-4 max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <Select
            label="Período"
            tone="light"
            value={filtros.periodoModo}
            onChange={(e) =>
              patch({ periodoModo: e.target.value as VeiculoFaturamentoPeriodoModo })
            }
            options={[
              { value: "mes", label: "Mês específico" },
              { value: "datas", label: "Datas específicas" },
              { value: "todos", label: "Todos os períodos" },
            ]}
          />

          {filtros.periodoModo === "mes" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Mês"
                tone="light"
                value={String(filtros.mes)}
                onChange={(e) => patch({ mes: Number(e.target.value) })}
                options={MESES}
              />
              <Select
                label="Ano"
                tone="light"
                value={String(filtros.ano)}
                onChange={(e) => patch({ ano: Number(e.target.value) })}
                options={anosDisponiveis()}
              />
            </div>
          )}

          {filtros.periodoModo === "datas" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="De"
                type="date"
                tone="light"
                value={filtros.dataDe}
                onChange={(e) => patch({ dataDe: e.target.value })}
              />
              <Input
                label="Até"
                type="date"
                tone="light"
                value={filtros.dataAte}
                onChange={(e) => patch({ dataAte: e.target.value })}
              />
            </div>
          )}

          <Select
            label="Vínculo"
            tone="light"
            value={filtros.vinculo}
            onChange={(e) =>
              patch({
                vinculo: e.target.value as "" | RecursoVinculo,
                veiculoIds: null,
              })
            }
            options={[
              { value: "", label: "Todos (frota e terceiro)" },
              ...VINCULO_OPCOES.map((o) => ({ value: o.value, label: o.label })),
            ]}
          />

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-300">Veículos</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="text-xs font-semibold text-cyan-400 hover:underline"
                  onClick={() => marcarTodos(true)}
                >
                  Marcar todos
                </button>
                <button
                  type="button"
                  className="text-xs font-semibold text-slate-400 hover:underline"
                  onClick={() => marcarTodos(false)}
                >
                  Limpar
                </button>
              </div>
            </div>
            <p className="mb-2 text-xs text-slate-500">
              Por padrão entram todas as placas do vínculo. Desmarque ou escolha só as que devem ir no PDF.
            </p>
            <Input
              tone="light"
              placeholder="Buscar placa ou nome..."
              value={buscaPlaca}
              onChange={(e) => setBuscaPlaca(e.target.value)}
            />
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-700 bg-[#141414]">
              {veiculosVisiveis.length === 0 ? (
                <p className="px-3 py-3 text-sm text-slate-500">Nenhum veículo encontrado.</p>
              ) : (
                veiculosVisiveis.map((v) => {
                  const marcado = todosMarcados || idsSelecionados.has(v.id);
                  return (
                    <label
                      key={v.id}
                      className="flex cursor-pointer items-center gap-2 border-b border-slate-800 px-3 py-2 text-sm last:border-b-0 hover:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => toggleVeiculo(v.id)}
                        className="rounded border-slate-500"
                      />
                      <span className="font-mono text-slate-100">{v.placa}</span>
                      <span className="truncate text-slate-400">
                        {v.nome}
                        {filtros.vinculo ? "" : ` · ${labelVinculo(v.vinculo)}`}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {todosMarcados
                ? `${veiculosDoVinculo.length} veículo(s) do vínculo`
                : `${qtdSelecionados} de ${veiculosDoVinculo.length} selecionado(s)`}
            </p>
          </div>

          {erro && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}
        </MebModalBody>

        <MebModalFooter className="mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="modal" onClick={handleGerar} disabled={gerando}>
            <FileDown className="h-4 w-4" />
            {gerando ? "Gerando..." : "Baixar PDF"}
          </Button>
        </MebModalFooter>
      </div>
    </MebModal>
  );
}
