"use client";

import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MebModal, MebModalBody, MebModalFooter, MebModalHeader } from "@/components/ui/modal";
import {
  filtrarRecebimentosRelatorio,
  gerarPdfRecebimentos,
} from "@/lib/recebimentos-pdf";
import type { RecebimentoComCanhotos } from "@/lib/recebimento-viagem";
import {
  RECEBIMENTO_STATUS_LABEL,
  type RecebimentoStatus,
} from "@/types/recebimento";

function padraoDatas() {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return {
    de: format(inicioMes, "yyyy-MM-dd"),
    ate: format(hoje, "yyyy-MM-dd"),
  };
}

const STATUS_OPCOES: { value: RecebimentoStatus | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pendente", label: RECEBIMENTO_STATUS_LABEL.pendente },
  { value: "pago", label: RECEBIMENTO_STATUS_LABEL.pago },
  { value: "vencido", label: RECEBIMENTO_STATUS_LABEL.vencido },
];

export function RecebimentosRelatorioModal({
  itens,
  open,
  onClose,
  titulo = "Relatório de Recebimentos",
  pdfSlug = "recebimentos",
}: {
  itens: RecebimentoComCanhotos[];
  open: boolean;
  onClose: () => void;
  titulo?: string;
  pdfSlug?: string;
}) {
  const [de, setDe] = useState(padraoDatas().de);
  const [ate, setAte] = useState(padraoDatas().ate);
  const [status, setStatus] = useState<RecebimentoStatus | "todos">("todos");
  const [fornecedor, setFornecedor] = useState("");
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);

  const fornecedorOpcoes = useMemo(() => {
    const nomes = new Set<string>();
    for (const item of itens) {
      const nome = item.empresa?.trim();
      if (nome && nome !== "—") nomes.add(nome);
    }
    return [
      { value: "", label: "Todos os fornecedores" },
      ...[...nomes]
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .map((nome) => ({ value: nome, label: nome })),
    ];
  }, [itens]);

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
      const filtrados = filtrarRecebimentosRelatorio(itens, de, ate, status, fornecedor || undefined);
      if (!filtrados.length) {
        setErro("Nenhum recebimento encontrado para o período e filtros selecionados.");
        return;
      }
      const statusLabel =
        status === "todos" ? "Todos" : RECEBIMENTO_STATUS_LABEL[status];
      gerarPdfRecebimentos(filtrados, de, ate, statusLabel, {
        titulo,
        arquivoSlug: pdfSlug,
        fornecedorLabel: fornecedor || undefined,
      });
      onClose();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar PDF.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <MebModal open={open} onClose={onClose} aria-labelledby="recebimentos-relatorio-titulo">
      <div className="p-6">
        <MebModalHeader
          id="recebimentos-relatorio-titulo"
          title={titulo}
          description="Escolha o intervalo de datas e, se quiser, filtre por status e fornecedor. O PDF inclui motorista, fornecedor, valores e observações."
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
              required
            />
            <Input
              label="Até"
              type="date"
              tone="light"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              required
            />
          </div>

          <Select
            label="Status do pagamento"
            tone="light"
            value={status}
            onChange={(e) => setStatus(e.target.value as RecebimentoStatus | "todos")}
            options={STATUS_OPCOES.map((s) => ({ value: s.value, label: s.label }))}
          />

          <Select
            label="Fornecedor"
            tone="light"
            value={fornecedor}
            onChange={(e) => setFornecedor(e.target.value)}
            options={fornecedorOpcoes}
          />

          {erro && <p className="text-sm text-red-600">{erro}</p>}
        </MebModalBody>

        <MebModalFooter className="mt-6">
          <Button variant="modal" onClick={handleGerar} disabled={gerando}>
            <FileDown className="h-4 w-4" />
            {gerando ? "Gerando..." : "Baixar PDF"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </MebModalFooter>
      </div>
    </MebModal>
  );
}
