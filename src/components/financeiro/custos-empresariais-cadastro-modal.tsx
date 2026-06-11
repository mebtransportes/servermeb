"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { BrNumberInput } from "@/components/ui/br-number-input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MebModal, MebModalBody, MebModalFooter, MebModalHeader } from "@/components/ui/modal";
import { parseBrNumber } from "@/lib/number-format";
import { cadastrarDespesaEmpresarial } from "@/lib/custos-empresariais";
import { SEGMENTOS_EMPRESARIAIS, type SegmentoEmpresarial } from "@/types/custos-empresariais";
import { format } from "date-fns";

export function CustosEmpresariaisCadastroModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [segmento, setSegmento] = useState<SegmentoEmpresarial>("escritorio");
  const [valor, setValor] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [nomeItem, setNomeItem] = useState("");
  const [ondeComprou, setOndeComprou] = useState("");
  const [dataDespesa, setDataDespesa] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!nomeItem.trim() || !ondeComprou.trim()) {
      setErro("Informe o nome do item e onde comprou.");
      return;
    }
    const v = parseBrNumber(valor);
    if (v == null || v <= 0) {
      setErro("Informe um valor válido.");
      return;
    }
    setSaving(true);
    const err = await cadastrarDespesaEmpresarial({
      segmento,
      valor: v,
      quantidade: Math.max(1, Math.round(parseBrNumber(quantidade) ?? 1)),
      nome_item: nomeItem.trim(),
      onde_comprou: ondeComprou.trim(),
      data_despesa: dataDespesa,
    });
    setSaving(false);
    if (err) {
      setErro(err);
      return;
    }
    setValor("");
    setQuantidade("1");
    setNomeItem("");
    setOndeComprou("");
    onSaved();
    onClose();
  }

  return (
    <MebModal open={open} onClose={onClose} aria-labelledby="despesa-emp-titulo">
      <form onSubmit={handleSubmit} className="p-6">
        <MebModalHeader
          id="despesa-emp-titulo"
          title="Cadastrar despesa empresarial"
          description="Segmentos: Materiais de Escritório, Limpeza ou Contabilidade e Sistemas."
          onClose={onClose}
        />

        <MebModalBody className="mt-4 space-y-3">
          <Select
            label="Segmento"
            tone="light"
            value={segmento}
            onChange={(e) => setSegmento(e.target.value as SegmentoEmpresarial)}
            options={SEGMENTOS_EMPRESARIAIS.map((s) => ({ value: s.value, label: s.label }))}
          />
          <Input
            label="Nome do item"
            tone="light"
            value={nomeItem}
            onChange={(e) => setNomeItem(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <BrNumberInput
              label="Valor gasto (R$)"
              decimalPlaces={2}
              value={valor}
              onChange={setValor}
              required
            />
            <BrNumberInput
              label="Quantidade"
              decimalPlaces={0}
              value={quantidade}
              onChange={setQuantidade}
              placeholder="Ex: 1, 2, 10"
            />
          </div>
          <Input
            label="Onde comprou"
            tone="light"
            value={ondeComprou}
            onChange={(e) => setOndeComprou(e.target.value)}
            required
          />
          <Input
            label="Data da despesa"
            type="date"
            tone="light"
            value={dataDespesa}
            onChange={(e) => setDataDespesa(e.target.value)}
            required
          />
          {erro && <p className="text-sm text-red-400">{erro}</p>}
        </MebModalBody>

        <MebModalFooter className="mt-6 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="modal" disabled={saving}>
            {saving ? "Salvando..." : "Cadastrar"}
          </Button>
        </MebModalFooter>
      </form>
    </MebModal>
  );
}
