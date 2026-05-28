"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function AbastecimentoForm({
  onSaved,
  onCancel,
}: {
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [veiculoId, setVeiculoId] = useState("");
  const [postoId, setPostoId] = useState("");
  const [km, setKm] = useState("");
  const [litros, setLitros] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataHora, setDataHora] = useState("");
  const [veiculos, setVeiculos] = useState<{ id: string; nome: string; placa: string }[]>([]);
  const [postos, setPostos] = useState<{ id: string; nome: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("veiculos").select("id, nome, placa").order("nome"),
      supabase.from("postos").select("id, nome").order("nome"),
    ]).then(([v, p]) => {
      setVeiculos(v.data ?? []);
      setPostos(p.data ?? []);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: err } = await supabase.from("frota_abastecimentos").insert({
      veiculo_id: veiculoId || null,
      posto_id: postoId || null,
      km_abastecimento: km ? parseFloat(km) : null,
      litros: litros ? parseFloat(litros) : null,
      valor: parseFloat(valor) || 0,
      descricao: descricao || null,
      data_hora: new Date(dataHora).toISOString(),
      origem: "manual",
      created_by: user?.id,
    });

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-700/50 bg-slate-900/80 p-5"
    >
      <h3 className="font-semibold text-cyan-400">Novo abastecimento manual</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Veículo"
          value={veiculoId}
          onChange={(e) => setVeiculoId(e.target.value)}
          options={[
            { value: "", label: "Selecione..." },
            ...veiculos.map((v) => ({
              value: v.id,
              label: `${v.nome} — ${v.placa}`,
            })),
          ]}
        />
        <Select
          label="Posto"
          value={postoId}
          onChange={(e) => setPostoId(e.target.value)}
          options={[
            { value: "", label: "Selecione..." },
            ...postos.map((p) => ({ value: p.id, label: p.nome })),
          ]}
        />
        <Input
          label="KM no abastecimento"
          type="number"
          step="0.1"
          value={km}
          onChange={(e) => setKm(e.target.value)}
          required
        />
        <Input
          label="Litros (opcional)"
          type="number"
          step="0.01"
          value={litros}
          onChange={(e) => setLitros(e.target.value)}
        />
        <Input
          label="Valor (R$)"
          type="number"
          step="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          required
        />
        <Input
          label="Data e hora"
          type="datetime-local"
          value={dataHora}
          onChange={(e) => setDataHora(e.target.value)}
          required
        />
        <Textarea
          label="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="sm:col-span-2"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Cadastrar"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
