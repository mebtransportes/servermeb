"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { FileDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MebModal, MebModalBody, MebModalFooter, MebModalHeader } from "@/components/ui/modal";
import {
  filtrarViagensAcompanhamentoRelatorio,
  listarPlacasAcompanhamento,
  type AcompanhamentoRelatorioFiltros,
  type AcompanhamentoViagemItem,
} from "@/lib/acompanhamento-data";
import { gerarPdfAcompanhamentoRelatorio } from "@/lib/acompanhamento-relatorio-pdf";
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
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);

  const placaOpcoes = useMemo(
    () => [
      { value: "", label: "Todas as placas" },
      ...listarPlacasAcompanhamento(viagens).map((p) => ({ value: p, label: p })),
    ],
    [viagens]
  );

  function validar(): boolean {
    if (!de || !ate) {
      setErro("Informe a data inicial e a data final.");
      return false;
    }
    if (de > ate) {
      setErro("A data inicial não pode ser posterior à data final.");
      return false;
    }
    setErro("");
    return true;
  }

  function handleGerar() {
    if (!validar()) return;
    setGerando(true);
    try {
      const filtros: AcompanhamentoRelatorioFiltros = {
        de,
        ate,
        status,
        fornecedorId,
        vinculo,
        placa,
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
      gerarPdfAcompanhamentoRelatorio(filtradas, filtros, fornecedores);
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
          description="Defina o período e os filtros. Com uma placa, o PDF lista as viagens e o resumo. Com todas as placas, cada veículo ganha sua própria seção com viagens e totais."
          onClose={onClose}
        />

        <MebModalBody className="mt-4 space-y-4">
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

          <Select
            label="Fornecedor"
            tone="light"
            value={fornecedorId}
            onChange={(e) => setFornecedorId(e.target.value)}
            options={[
              { value: "", label: "Todos os fornecedores" },
              ...fornecedores.map((f) => ({ value: f.id, label: f.nome })),
            ]}
          />

          <Select
            label="Placa do veículo"
            tone="light"
            value={placa}
            onChange={(e) => setPlaca(e.target.value)}
            options={placaOpcoes}
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
