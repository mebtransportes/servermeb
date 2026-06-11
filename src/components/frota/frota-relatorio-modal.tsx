"use client";

import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MebModal, MebModalBody, MebModalFooter, MebModalHeader } from "@/components/ui/modal";
import { dataNoIntervalo } from "@/lib/frota-filters";
import {
  gerarPdfManutencao,
  gerarPdfAbastecimento,
  gerarPdfAbastecimentoPorVeiculos,
} from "@/lib/frota-relatorio-pdf";
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

function filtrarPorVeiculo<T extends { veiculoPlaca?: string }>(
  lista: T[],
  placa: string
) {
  if (!placa) return lista;
  return lista.filter((i) => i.veiculoPlaca === placa);
}

export function FrotaRelatorioModal(props: Props) {
  const { open, onClose, tipo, itens } = props;
  const [de, setDe] = useState(padraoDatas().de);
  const [ate, setAte] = useState(padraoDatas().ate);
  const [veiculoPlaca, setVeiculoPlaca] = useState("");
  const [formatoAbastecimento, setFormatoAbastecimento] = useState<"geral" | "por_veiculo">(
    "geral"
  );
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);

  const veiculoOpcoes = useMemo(() => {
    const map = new Map<string, string>();
    if (tipo === "manutencao") {
      for (const i of itens as ManutencaoCard[]) {
        if (i.veiculoPlaca) map.set(i.veiculoPlaca, i.veiculoPlaca);
      }
    } else {
      for (const i of itens as AbastecimentoCard[]) {
        if (i.veiculoPlaca) {
          map.set(i.veiculoPlaca, i.veiculoLabel ?? i.veiculoPlaca);
        }
      }
    }
    return [
      { value: "", label: "Todos os veículos" },
      ...[...map.entries()]
        .sort(([, a], [, b]) => a.localeCompare(b, "pt-BR"))
        .map(([placa, label]) => ({ value: placa, label })),
    ];
  }, [itens, tipo]);

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
    const porPeriodo = (itens as ManutencaoCard[]).filter((i) => {
      const ref = i.dataRef.includes("T") ? i.dataRef : `${i.dataRef}T12:00:00`;
      return dataNoIntervalo(ref, de, ate);
    });
    return filtrarPorVeiculo(porPeriodo, veiculoPlaca);
  }

  function filtrarAbastecimento() {
    const porPeriodo = (itens as AbastecimentoCard[]).filter((i) =>
      dataNoIntervalo(i.dataHora, de, ate)
    );
    return filtrarPorVeiculo(porPeriodo, veiculoPlaca);
  }

  async function handleGerar() {
    if (!validar()) return;
    setGerando(true);
    try {
      if (tipo === "manutencao") {
        const filtrados = filtrarManutencao();
        if (!filtrados.length) {
          setErro("Nenhum registro encontrado para o período e veículo selecionados.");
          return;
        }
        gerarPdfManutencao(filtrados, de, ate);
      } else {
        const filtrados = filtrarAbastecimento();
        if (!filtrados.length) {
          setErro("Nenhum registro encontrado para o período e veículo selecionados.");
          return;
        }
        if (formatoAbastecimento === "por_veiculo" && !veiculoPlaca) {
          gerarPdfAbastecimentoPorVeiculos(filtrados, de, ate);
        } else {
          gerarPdfAbastecimento(filtrados, de, ate);
        }
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

  const descricao =
    tipo === "manutencao"
      ? "Filtre por período e veículo. O PDF inclui valores, locais, descrições, motoristas e anexos."
      : "Filtre por período e veículo. Escolha o formato do relatório em PDF.";

  return (
    <MebModal open={open} onClose={onClose} aria-labelledby="relatorio-titulo">
      <div className="p-6">
        <MebModalHeader
          id="relatorio-titulo"
          title={titulo}
          description={descricao}
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
            label="Veículo"
            tone="light"
            value={veiculoPlaca}
            onChange={(e) => setVeiculoPlaca(e.target.value)}
            options={veiculoOpcoes}
          />

          {tipo === "abastecimento" && (
            <Select
              label="Formato do relatório"
              tone="light"
              value={formatoAbastecimento}
              onChange={(e) =>
                setFormatoAbastecimento(e.target.value as "geral" | "por_veiculo")
              }
              options={[
                { value: "geral", label: "Geral — tabela única" },
                {
                  value: "por_veiculo",
                  label: veiculoPlaca
                    ? "Por caminhão — seção do veículo"
                    : "Por caminhão — uma seção por veículo",
                },
              ]}
            />
          )}

          {erro && <p className="text-sm text-red-400">{erro}</p>}
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
