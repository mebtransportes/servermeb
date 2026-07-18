"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { FileDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CadastroOpcaoAutocomplete } from "@/components/ui/cadastro-opcao-autocomplete";
import { Button } from "@/components/ui/button";
import { MebModal, MebModalBody, MebModalFooter, MebModalHeader } from "@/components/ui/modal";
import {
  filtrarViagensAcompanhamentoRelatorio,
  listarPlacasAcompanhamento,
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
import { VIAGEM_STATUS_FILTRO_ACOMPANHAMENTO, VINCULO_OPCOES } from "@/lib/viagem-validation";
import { VIAGEM_STATUS_LABEL } from "@/lib/viagem-status";
import type { RecursoVinculo } from "@/types";

function padraoDatas() {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return {
    de: format(inicioMes, "yyyy-MM-dd"),
    ate: format(hoje, "yyyy-MM-dd"),
  };
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
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);

  const placasRelatorio = useMemo(() => listarPlacasAcompanhamento(viagens), [viagens]);
  const qtdColunas = useMemo(
    () => ACOMPANHAMENTO_RELATORIO_COLUNAS.filter((c) => colunas[c.key]).length,
    [colunas]
  );

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

  function validar(): boolean {
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

  async function handleGerar() {
    if (!validar()) return;

    const placaFiltro = placa.trim();
    if (placaDigitada.trim() && !placaFiltro) {
      setErro("Selecione uma placa de caminhão ou cavalo na lista de sugestões.");
      return;
    }
    if (placaFiltro) {
      const placaValida = resolverPlacaRelatorioAcompanhamento(placasRelatorio, placaFiltro);
      if (!placaValida) {
        setErro("Placa inválida. Escolha um caminhão ou cavalo cadastrado nas viagens.");
        return;
      }
    }

    setGerando(true);
    try {
      const placaResolvida = placaFiltro
        ? resolverPlacaRelatorioAcompanhamento(placasRelatorio, placaFiltro) ?? ""
        : "";

      const filtros: AcompanhamentoRelatorioFiltros = {
        de,
        ate,
        status,
        fornecedorId,
        vinculo,
        placa: placaResolvida,
      };
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
      await gerarPdfAcompanhamentoRelatorio(filtradas, filtros, fornecedores, colunas);
      onClose();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar PDF.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <MebModal open={open} onClose={onClose} aria-labelledby="acompanhamento-relatorio-titulo">
      <div className="p-6">
        <MebModalHeader
          id="acompanhamento-relatorio-titulo"
          title="Relatório de Acompanhamento"
          description="Defina o período, os filtros e quais dados devem aparecer no PDF. O relatório considera apenas placas de caminhão e cavalo (carretas são ignoradas)."
          onClose={onClose}
        />

        <MebModalBody className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto">
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

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-800">Dados do relatório</p>
                <p className="text-xs text-slate-500">
                  Marque o que deve aparecer no PDF ({qtdColunas} selecionado
                  {qtdColunas === 1 ? "" : "s"}).
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => marcarTodas(true)}
                  className="text-xs font-medium text-cyan-700 hover:underline"
                >
                  Marcar todos
                </button>
                <button
                  type="button"
                  onClick={() => marcarTodas(false)}
                  className="text-xs font-medium text-slate-500 hover:underline"
                >
                  Limpar
                </button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {ACOMPANHAMENTO_RELATORIO_COLUNAS.map((c) => (
                <label
                  key={c.key}
                  className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-sm text-slate-700 hover:bg-white/80"
                >
                  <input
                    type="checkbox"
                    checked={colunas[c.key]}
                    onChange={() => toggleColuna(c.key)}
                    className="mt-0.5 rounded border-slate-300"
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
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
          <Button type="button" onClick={handleGerar} disabled={gerando}>
            <FileDown className="h-4 w-4" />
            {gerando ? "Gerando..." : "Gerar PDF"}
          </Button>
        </MebModalFooter>
      </div>
    </MebModal>
  );
}
