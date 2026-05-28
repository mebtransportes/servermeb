"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { FrotaManutencaoStatus } from "@/types/frota";

export function ManutencaoForm({
  statusInicial,
  onSaved,
  onCancel,
}: {
  statusInicial: FrotaManutencaoStatus;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [onde, setOnde] = useState("");
  const [oficinaId, setOficinaId] = useState("");
  const [oficinas, setOficinas] = useState<{ id: string; nome: string }[]>([]);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState<FrotaManutencaoStatus>(statusInicial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    createClient()
      .from("oficinas")
      .select("id, nome")
      .order("nome")
      .then(({ data }) => setOficinas(data ?? []));
  }, []);

  useEffect(() => {
    if (oficinaId) {
      const o = oficinas.find((x) => x.id === oficinaId);
      if (o) setOnde(o.nome);
    }
  }, [oficinaId, oficinas]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: err } = await supabase.from("frota_manutencoes").insert({
      nome,
      descricao: descricao || null,
      onde: onde || "Não informado",
      oficina_id: oficinaId || null,
      data_agendada: data,
      hora_agendada: hora || null,
      valor_total: parseFloat(valor) || 0,
      status,
      origem: "preventiva",
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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-700/50 bg-slate-900/80 p-5">
      <h3 className="font-semibold text-cyan-400">Nova manutenção preventiva</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nome da manutenção" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <Select
          label="Status inicial"
          value={status}
          onChange={(e) => setStatus(e.target.value as FrotaManutencaoStatus)}
          options={[
            { value: "AGENDADO", label: "Agendado" },
            { value: "EM ANDAMENTO", label: "Em andamento" },
            { value: "FINALIZADO", label: "Finalizado" },
          ]}
        />
        <Textarea
          label="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="sm:col-span-2"
        />
        <Select
          label="Oficina (opcional)"
          value={oficinaId}
          onChange={(e) => setOficinaId(e.target.value)}
          options={[
            { value: "", label: "Digitar local manualmente" },
            ...oficinas.map((o) => ({ value: o.id, label: o.nome })),
          ]}
        />
        <Input
          label="Onde será feito"
          value={onde}
          onChange={(e) => setOnde(e.target.value)}
          required
          disabled={!!oficinaId}
        />
        <Input label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        <Input label="Hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        <Input
          label="Valor total (R$)"
          type="number"
          step="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          required
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
