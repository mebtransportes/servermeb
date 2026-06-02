"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { BrNumberInput } from "@/components/ui/br-number-input";
import { parseBrNumber, rawNumberStringToBrInput } from "@/lib/number-format";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { AnexosFrotaCampos } from "@/components/frota/anexos-campos";
import { salvarAnexosFrota } from "@/lib/frota-anexos";
import { carregarManutencaoEdicao } from "@/lib/frota-crud";
import type { FrotaManutencaoStatus, ManutencaoCard } from "@/types/frota";

export function ManutencaoForm({
  item,
  statusInicial = "AGENDADO",
  onSaved,
  onCancel,
}: {
  item?: ManutencaoCard;
  statusInicial?: FrotaManutencaoStatus;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const editando = !!item;
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [onde, setOnde] = useState("");
  const [oficinaId, setOficinaId] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [kmVeiculo, setKmVeiculo] = useState("");
  const [oficinas, setOficinas] = useState<{ id: string; nome: string }[]>([]);
  const [veiculos, setVeiculos] = useState<{ id: string; nome: string; placa: string }[]>([]);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState<FrotaManutencaoStatus>(statusInicial);
  const [notaFiscal, setNotaFiscal] = useState<File | null>(null);
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [anexosExistentes, setAnexosExistentes] = useState<{
    nota_fiscal_path?: string | null;
    comprovante_path?: string | null;
    nota_fiscal_nome?: string | null;
    comprovante_nome?: string | null;
  }>({});
  const [frotaId, setFrotaId] = useState<string>();
  const [viagemRecursoId, setViagemRecursoId] = useState<string>();
  const [source, setSource] = useState<"preventiva" | "viagem">("preventiva");
  const [loading, setLoading] = useState(!!item);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("oficinas").select("id, nome").order("nome"),
      supabase.from("veiculos").select("id, nome, placa").order("nome"),
    ]).then(([o, v]) => {
      setOficinas(o.data ?? []);
      setVeiculos(v.data ?? []);
    });
  }, []);

  useEffect(() => {
    if (!item) return;
    carregarManutencaoEdicao(item).then((d) => {
      if (!d) return;
      setSource(d.source);
      setFrotaId(d.frotaId);
      setViagemRecursoId(d.viagemRecursoId);
      setNome(d.nome);
      setDescricao(d.descricao);
      setOnde(d.onde);
      setOficinaId(d.oficinaId);
      setVeiculoId(d.veiculoId);
      setKmVeiculo(rawNumberStringToBrInput(d.kmVeiculo, 0));
      setData(d.data);
      setHora(d.hora);
      setValor(rawNumberStringToBrInput(d.valor, 2));
      setStatus(d.status);
      setAnexosExistentes({
        nota_fiscal_path: d.nota_fiscal_path,
        comprovante_path: d.comprovante_path,
        nota_fiscal_nome: d.nota_fiscal_nome,
        comprovante_nome: d.comprovante_nome,
      });
      setLoading(false);
    });
  }, [item]);

  useEffect(() => {
    if (oficinaId) {
      const o = oficinas.find((x) => x.id === oficinaId);
      if (o) setOnde(o.nome);
    }
  }, [oficinaId, oficinas]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const supabase = createClient();

    const anexosNovos =
      notaFiscal || comprovante
        ? await salvarAnexosFrota(
            frotaId
              ? `frota/manutencoes/${frotaId}`
              : viagemRecursoId
                ? `viagens/recursos/${viagemRecursoId}`
                : "frota/temp",
            notaFiscal,
            comprovante
          )
        : null;

    const anexosPayload = {
      nota_fiscal_path: anexosNovos?.nota_fiscal_path ?? anexosExistentes.nota_fiscal_path,
      nota_fiscal_nome: anexosNovos?.nota_fiscal_nome ?? anexosExistentes.nota_fiscal_nome,
      comprovante_path: anexosNovos?.comprovante_path ?? anexosExistentes.comprovante_path,
      comprovante_nome: anexosNovos?.comprovante_nome ?? anexosExistentes.comprovante_nome,
    };

    if (editando && source === "preventiva" && frotaId) {
      const { error: err } = await supabase
        .from("frota_manutencoes")
        .update({
          nome,
          descricao: descricao || null,
          onde: onde || "Não informado",
          oficina_id: oficinaId || null,
          veiculo_id: veiculoId || null,
          km_veiculo: parseBrNumber(kmVeiculo),
          data_agendada: data,
          hora_agendada: hora || null,
          valor_total: parseBrNumber(valor) ?? 0,
          status,
          ...anexosPayload,
        })
        .eq("id", frotaId);
      setSaving(false);
      if (err) {
        setError(err.message);
        return;
      }
      onSaved();
      return;
    }

    if (editando && source === "viagem" && viagemRecursoId) {
      const realizado = hora
        ? new Date(`${data}T${hora}:00`)
        : new Date(`${data}T12:00:00`);
      const { error: err } = await supabase
        .from("viagem_recursos")
        .update({
          descricao: nome,
          valor: parseBrNumber(valor) ?? 0,
          oficina_id: oficinaId || null,
          km_veiculo: parseBrNumber(kmVeiculo),
          realizado_em: realizado.toISOString(),
          status_frota: status,
          ...anexosPayload,
        })
        .eq("id", viagemRecursoId);
      setSaving(false);
      if (err) {
        setError(err.message);
        return;
      }
      onSaved();
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: row, error: err } = await supabase
      .from("frota_manutencoes")
      .insert({
        nome,
        descricao: descricao || null,
        onde: onde || "Não informado",
        oficina_id: oficinaId || null,
        veiculo_id: veiculoId || null,
        km_veiculo: parseBrNumber(kmVeiculo),
        data_agendada: data,
        hora_agendada: hora || null,
        valor_total: parseBrNumber(valor) ?? 0,
        status,
        origem: "preventiva",
        created_by: user?.id,
      })
      .select("id")
      .single();

    if (err || !row) {
      setSaving(false);
      setError(err?.message ?? "Erro ao salvar");
      return;
    }

    if (notaFiscal || comprovante) {
      const anexos = await salvarAnexosFrota(
        `frota/manutencoes/${row.id}`,
        notaFiscal,
        comprovante
      );
      await supabase.from("frota_manutencoes").update(anexos).eq("id", row.id);
    }

    setSaving(false);
    onSaved();
  }

  if (loading) {
    return <p className="text-slate-400">Carregando...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-700/50 bg-slate-900/80 p-5">
      <h3 className="font-semibold text-cyan-400">
        {editando ? "Editar manutenção" : "Nova manutenção preventiva"}
      </h3>
      {editando && source === "viagem" && (
        <p className="text-xs text-cyan-400/80">Registro originado de viagem — alguns campos usam o cadastro da viagem.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nome da manutenção" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <Select
          label="Status"
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
        {source === "preventiva" && (
          <Select
            label="Veículo (opcional)"
            value={veiculoId}
            onChange={(e) => setVeiculoId(e.target.value)}
            options={[
              { value: "", label: "Não informar veículo" },
              ...veiculos.map((v) => ({
                value: v.id,
                label: `${v.nome} — ${v.placa}`,
              })),
            ]}
          />
        )}
        <BrNumberInput
          label="Quilometragem do veículo (opcional)"
          decimalPlaces={0}
          value={kmVeiculo}
          onChange={setKmVeiculo}
          placeholder="Ex: 125.430"
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
        <BrNumberInput
          label="Valor total (R$)"
          decimalPlaces={2}
          value={valor}
          onChange={setValor}
          required
        />
      </div>

      <AnexosFrotaCampos
        notaFiscal={notaFiscal}
        comprovante={comprovante}
        onNotaFiscalChange={setNotaFiscal}
        onComprovanteChange={setComprovante}
        existentes={anexosExistentes}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
