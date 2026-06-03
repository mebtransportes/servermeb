"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BrNumberInput } from "@/components/ui/br-number-input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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

  if (!open) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Cadastrar despesa empresarial</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Segmentos: Materiais de Escritório, Limpeza ou Contabilidade e Sistemas.
        </p>
        <div className="space-y-3">
          <Select
            label="Segmento"
            value={segmento}
            onChange={(e) => setSegmento(e.target.value as SegmentoEmpresarial)}
            options={SEGMENTOS_EMPRESARIAIS.map((s) => ({ value: s.value, label: s.label }))}
          />
          <Input
            label="Nome do item"
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
            value={ondeComprou}
            onChange={(e) => setOndeComprou(e.target.value)}
            required
          />
          <Input
            label="Data da despesa"
            type="date"
            value={dataDespesa}
            onChange={(e) => setDataDespesa(e.target.value)}
            required
          />
        </div>
        {erro && <p className="mt-3 text-sm text-red-400">{erro}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Cadastrar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
