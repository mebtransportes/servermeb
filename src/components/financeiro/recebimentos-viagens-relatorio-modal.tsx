"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { FileDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CadastroOpcaoAutocomplete } from "@/components/ui/cadastro-opcao-autocomplete";
import { Button } from "@/components/ui/button";
import { MebModal, MebModalBody, MebModalFooter, MebModalHeader } from "@/components/ui/modal";
import { fetchFornecedoresAcompanhamento } from "@/lib/acompanhamento-data";
import { gerarPdfRecebimentosViagensSaida } from "@/lib/recebimentos-pdf";
import { buscarLinhasRelatorioTodasViagens } from "@/lib/recebimentos-viagens-relatorio";
import type { ParceiroSugestao } from "@/lib/parceiros";

function padraoDatas() {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return {
    de: format(inicioMes, "yyyy-MM-dd"),
    ate: format(hoje, "yyyy-MM-dd"),
  };
}

export function RecebimentosViagensRelatorioModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [de, setDe] = useState(padraoDatas().de);
  const [ate, setAte] = useState(padraoDatas().ate);
  const [fornecedorId, setFornecedorId] = useState("");
  const [fornecedores, setFornecedores] = useState<ParceiroSugestao[]>([]);
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchFornecedoresAcompanhamento().then(setFornecedores);
  }, [open]);

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

  async function handleGerar() {
    if (!validar()) return;
    setGerando(true);
    try {
      const linhas = await buscarLinhasRelatorioTodasViagens(
        de,
        ate,
        fornecedorId || undefined
      );
      if (!linhas.length) {
        setErro("Nenhuma viagem encontrada para o período e fornecedor selecionados.");
        return;
      }
      const fornecedorLabel = fornecedorId
        ? fornecedores.find((f) => f.id === fornecedorId)?.nome
        : undefined;
      gerarPdfRecebimentosViagensSaida(linhas, de, ate, { fornecedorLabel });
      onClose();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar PDF.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <MebModal open={open} onClose={onClose} aria-labelledby="recebimentos-viagens-relatorio-titulo">
      <div className="p-6">
        <MebModalHeader
          id="recebimentos-viagens-relatorio-titulo"
          title="Relatório de Viagens por Saída"
          description="Lista todas as viagens cadastradas (em qualquer status), filtradas pela data de saída do caminhão e fornecedor. Inclui valores financeiros e status do acompanhamento."
          onClose={onClose}
        />

        <MebModalBody className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Saída de"
              type="date"
              tone="light"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              required
            />
            <Input
              label="Saída até"
              type="date"
              tone="light"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              required
            />
          </div>

          <CadastroOpcaoAutocomplete
            label="Fornecedor"
            options={fornecedores.map((f) => ({ value: f.id, label: f.nome }))}
            value={fornecedorId}
            onValueChange={setFornecedorId}
            opcional
            placeholder="Todos — digite o nome (mín. 2 letras)"
            hint="Deixe em branco para incluir todos os fornecedores."
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
          <Button type="button" variant="modal" onClick={handleGerar} disabled={gerando}>
            <FileDown className="h-4 w-4" />
            {gerando ? "Gerando..." : "Baixar PDF"}
          </Button>
        </MebModalFooter>
      </div>
    </MebModal>
  );
}
