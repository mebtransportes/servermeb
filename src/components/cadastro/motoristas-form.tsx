"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { uploadPdf } from "@/lib/storage";
import { excluirAnexoTabela } from "@/lib/anexos-crud";
import { AnexoArquivoRow } from "@/components/shared/anexo-arquivo-row";
import { calcularIdade } from "@/lib/utils";
import type { Motorista, RecursoVinculo } from "@/types";
import { isFrota, VINCULO_OPCOES } from "@/lib/viagem-validation";
import { FileUploadField } from "@/components/ui/file-upload";

type Anexo = { id?: string; nome: string; storage_path: string; file_name: string };

export function MotoristasForm({
  motorista,
  onSaved,
  onCancel,
}: {
  motorista?: Motorista & { anexos?: Anexo[] };
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState(motorista?.nome_completo ?? "");
  const [vinculo, setVinculo] = useState<RecursoVinculo>(motorista?.vinculo ?? "frota");
  const [cpf, setCpf] = useState(motorista?.cpf ?? "");
  const ehFrota = isFrota(vinculo);
  const [dataNasc, setDataNasc] = useState(motorista?.data_nascimento ?? "");
  const [idade, setIdade] = useState<number | null>(null);
  const [cnhNumero, setCnhNumero] = useState(motorista?.cnh_numero ?? "");
  const [cnhCat, setCnhCat] = useState(motorista?.cnh_categoria ?? "");
  const [cnhExp, setCnhExp] = useState(motorista?.cnh_expedicao ?? "");
  const [cnhVenc, setCnhVenc] = useState(motorista?.cnh_vencimento ?? "");
  const [telefone, setTelefone] = useState(motorista?.telefone ?? "");
  const [emergencia, setEmergencia] = useState(motorista?.contato_emergencia ?? "");
  const [toxData, setToxData] = useState(motorista?.toxicologico_data ?? "");
  const [toxVenc, setToxVenc] = useState(motorista?.toxicologico_vencimento ?? "");
  const [anexos, setAnexos] = useState<Anexo[]>(motorista?.anexos ?? []);
  const [pdfNome, setPdfNome] = useState("CNH");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setIdade(calcularIdade(dataNasc));
  }, [dataNasc]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      nome_completo: nome,
      vinculo,
      cpf,
      data_nascimento: dataNasc || null,
      cnh_numero: cnhNumero || null,
      cnh_categoria: cnhCat || null,
      cnh_expedicao: cnhExp || null,
      cnh_vencimento: cnhVenc || null,
      telefone: telefone || null,
      contato_emergencia: emergencia || null,
      toxicologico_data: toxData || null,
      toxicologico_vencimento: toxVenc || null,
      created_by: user?.id,
    };

    let id = motorista?.id;

    if (id) {
      const { error: err } = await supabase.from("motoristas").update(payload).eq("id", id);
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
    } else {
      const { data, error: err } = await supabase
        .from("motoristas")
        .insert(payload)
        .select("id")
        .single();
      if (err || !data) {
        setError(err?.message ?? "Erro");
        setSaving(false);
        return;
      }
      id = data.id;
    }

    if (pdfFile && id) {
      const uploaded = await uploadPdf(pdfFile, `motoristas/${id}`);
      if (uploaded) {
        await supabase.from("motorista_anexos").insert({
          motorista_id: id,
          nome: pdfNome,
          storage_path: uploaded.path,
          file_name: uploaded.fileName,
        });
      }
    }

    setSaving(false);
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Select
        label="Vínculo do motorista"
        value={vinculo}
        onChange={(e) => setVinculo(e.target.value as RecursoVinculo)}
        options={VINCULO_OPCOES.map((o) => ({ value: o.value, label: o.label }))}
      />

      {!ehFrota && (
        <p className="rounded-lg border border-amber-800/40 bg-amber-950/25 px-4 py-3 text-sm text-amber-200">
          Motorista terceiro: cadastre os dados básicos para viagens e fechamento.
          CNH e toxicológico são opcionais e não bloqueiam novas viagens.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} required className="sm:col-span-2" />
        <Input label="CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} required />
        <Input
          label="Data de nascimento"
          type="date"
          value={dataNasc}
          onChange={(e) => setDataNasc(e.target.value)}
          required={ehFrota}
        />
        <Input label="Idade" value={idade != null ? `${idade} anos` : "—"} readOnly />
        <Input label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        <Input label="Contato de emergência" value={emergencia} onChange={(e) => setEmergencia(e.target.value)} className="sm:col-span-2" />
      </div>

      <div className="space-y-4 rounded-xl border border-slate-700/60 p-4">
        <h3 className="text-sm font-semibold text-cyan-400">
          {ehFrota ? "Documentação" : "Documentação (opcional)"}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Número da CNH" value={cnhNumero} onChange={(e) => setCnhNumero(e.target.value)} />
          <Input label="Categoria CNH" value={cnhCat} onChange={(e) => setCnhCat(e.target.value)} placeholder="AB, C, D..." />
          <Input label="Expedição CNH" type="date" value={cnhExp} onChange={(e) => setCnhExp(e.target.value)} />
          <Input label="Vencimento CNH" type="date" value={cnhVenc} onChange={(e) => setCnhVenc(e.target.value)} />
          <Input label="Exame toxicológico — data realizada" type="date" value={toxData} onChange={(e) => setToxData(e.target.value)} />
          <Input label="Exame toxicológico — vencimento" type="date" value={toxVenc} onChange={(e) => setToxVenc(e.target.value)} />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-700/60 p-4">
        <h3 className="text-sm font-semibold text-cyan-400">
          {ehFrota ? "Anexos PDF" : "Anexos PDF (opcional)"}
        </h3>
        {anexos.map((a) => (
          <AnexoItem
            key={a.id ?? a.storage_path}
            anexo={a}
            onExcluido={() => setAnexos((prev) => prev.filter((x) => x.id !== a.id))}
          />
        ))}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nome do documento" value={pdfNome} onChange={(e) => setPdfNome(e.target.value)} />
          <FileUploadField
            label="Arquivo PDF"
            accept="application/pdf"
            hint="Somente PDF"
            file={pdfFile}
            onChange={setPdfFile}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>{saving ? "Salvando..." : motorista ? "Atualizar" : "Cadastrar motorista"}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}

function AnexoItem({
  anexo,
  onExcluido,
}: {
  anexo: Anexo;
  onExcluido: () => void;
}) {
  const [excluindo, setExcluindo] = useState(false);

  async function handleExcluir() {
    if (!anexo.id) {
      onExcluido();
      return;
    }
    if (!confirm(`Excluir o documento "${anexo.nome}"?`)) return;
    setExcluindo(true);
    const err = await excluirAnexoTabela("motorista_anexos", anexo.id, anexo.storage_path);
    setExcluindo(false);
    if (err) {
      alert(err);
      return;
    }
    onExcluido();
  }

  return (
    <AnexoArquivoRow
      label={anexo.nome}
      storagePath={anexo.storage_path}
      onExcluir={handleExcluir}
      excluindo={excluindo}
    />
  );
}
