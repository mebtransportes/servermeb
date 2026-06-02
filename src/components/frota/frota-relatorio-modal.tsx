"use client";

import { useState } from "react";
import { FileDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { dataNoIntervalo } from "@/lib/frota-filters";
import { gerarPdfManutencao, gerarPdfAbastecimento } from "@/lib/frota-relatorio-pdf";
import type { ManutencaoCard, AbastecimentoCard } from "@/types/frota";
import { format } from "date-fns";

type Props =
  | {
      tipo: "manutencao";
      itens: ManutencaoCard[];
      open: boolean;
      onClose: () => void;
    }
  | {
      tipo: "abastecimento";
      itens: AbastecimentoCard[];
      open: boolean;
      onClose: () => void;
    };

function padraoDatas() {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return {
    de: format(inicioMes, "yyyy-MM-dd"),
    ate: format(hoje, "yyyy-MM-dd"),
  };
}

export function FrotaRelatorioModal(props: Props) {
  const { open, onClose, tipo, itens } = props;
  const [de, setDe] = useState(padraoDatas().de);
  const [ate, setAte] = useState(padraoDatas().ate);
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);

  if (!open) return null;

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

  function filtrarManutencao() {
    return (itens as ManutencaoCard[]).filter((i) => {
      const ref = i.dataRef.includes("T") ? i.dataRef : `${i.dataRef}T12:00:00`;
      return dataNoIntervalo(ref, de, ate);
    });
  }

  function filtrarAbastecimento() {
    return (itens as AbastecimentoCard[]).filter((i) =>
      dataNoIntervalo(i.dataHora, de, ate)
    );
  }

  async function handleGerar() {
    if (!validar()) return;
    setGerando(true);
    try {
      if (tipo === "manutencao") {
        gerarPdfManutencao(filtrarManutencao(), de, ate);
      } else {
        gerarPdfAbastecimento(filtrarAbastecimento(), de, ate);
      }
      onClose();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar PDF.");
    } finally {
      setGerando(false);
    }
  }

  const titulo =
    tipo === "manutencao"
      ? "Relatório de Manutenção"
      : "Relatório de Abastecimentos";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl"
        role="dialog"
        aria-labelledby="relatorio-titulo"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="relatorio-titulo" className="text-lg font-bold text-cyan-400">
              {titulo}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Escolha o período. O PDF inclui todos os registros com valores, locais,
              descrições, veículos, motoristas e anexos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="De"
            type="date"
            value={de}
            onChange={(e) => setDe(e.target.value)}
            required
          />
          <Input
            label="Até"
            type="date"
            value={ate}
            onChange={(e) => setAte(e.target.value)}
            required
          />
        </div>

        {erro && <p className="mt-3 text-sm text-red-400">{erro}</p>}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={handleGerar} disabled={gerando}>
            <FileDown className="h-4 w-4" />
            {gerando ? "Gerando..." : "Baixar PDF"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
