"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { uploadFile, getFileUrl } from "@/lib/storage";
import type { ViagemRecursoTipo } from "@/types";
import { Plus, FileText } from "lucide-react";
import { FileUploadMultiple } from "@/components/ui/file-upload";
import { AnexosFrotaCampos } from "@/components/frota/anexos-campos";
import { salvarAnexosFrota } from "@/lib/frota-anexos";

type Recurso = {
  id: string;
  tipo: ViagemRecursoTipo;
  valor: number;
  descricao?: string | null;
  posto_id?: string | null;
  oficina_id?: string | null;
  realizado_em: string;
  postos?: { nome: string } | null;
  oficinas?: { nome: string } | null;
};

type Anexo = {
  id: string;
  nome: string;
  file_name: string;
  storage_path: string;
};

export function ViagemRecursos({ viagemId }: { viagemId: string }) {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [postos, setPostos] = useState<{ id: string; nome: string }[]>([]);
  const [oficinas, setOficinas] = useState<{ id: string; nome: string }[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [tipo, setTipo] = useState<ViagemRecursoTipo>("abastecimento");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [postoId, setPostoId] = useState("");
  const [oficinaId, setOficinaId] = useState("");
  const [realizadoEm, setRealizadoEm] = useState("");
  const [kmVeiculo, setKmVeiculo] = useState("");
  const [notaFiscal, setNotaFiscal] = useState<File | null>(null);
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("viagem_recursos")
      .select("*, postos(nome), oficinas(nome)")
      .eq("viagem_id", viagemId)
      .order("realizado_em", { ascending: false });
    setRecursos((data as Recurso[]) ?? []);
  };

  useEffect(() => {
    load();
    const supabase = createClient();
    Promise.all([
      supabase.from("postos").select("id, nome").order("nome"),
      supabase.from("oficinas").select("id, nome").order("nome"),
    ]).then(([p, o]) => {
      setPostos(p.data ?? []);
      setOficinas(o.data ?? []);
    });
  }, [viagemId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();

    const payload: Record<string, unknown> = {
      viagem_id: viagemId,
      tipo,
      valor: parseFloat(valor),
      descricao: descricao || null,
      posto_id: tipo === "abastecimento" && postoId ? postoId : null,
      oficina_id: tipo === "manutencao" && oficinaId ? oficinaId : null,
      realizado_em: new Date(realizadoEm).toISOString(),
    };
    if (kmVeiculo) {
      const km = parseFloat(kmVeiculo);
      if (tipo === "abastecimento") payload.km_abastecimento = km;
      else if (tipo === "manutencao") payload.km_veiculo = km;
    }
    if (tipo === "manutencao") payload.status_frota = "FINALIZADO";

    const { data: recurso, error } = await supabase
      .from("viagem_recursos")
      .insert(payload)
      .select("id")
      .single();

    if (error || !recurso) {
      setSaving(false);
      return;
    }

    if (notaFiscal || comprovante) {
      const anexos = await salvarAnexosFrota(
        `viagens/${viagemId}/recursos/${recurso.id}`,
        notaFiscal,
        comprovante
      );
      await supabase.from("viagem_recursos").update(anexos).eq("id", recurso.id);
    }

    for (const file of files) {
      const up = await uploadFile(file, `viagens/${viagemId}/recursos/${recurso.id}`);
      if (up) {
        await supabase.from("viagem_anexos").insert({
          viagem_id: viagemId,
          recurso_id: recurso.id,
          categoria: "COMPROVANTE",
          nome: file.name,
          storage_path: up.path,
          file_name: up.fileName,
          mime_type: up.mimeType,
          origem: "recurso",
        });
      }
    }

    setShowForm(false);
    setValor("");
    setDescricao("");
    setPostoId("");
    setOficinaId("");
    setRealizadoEm("");
    setKmVeiculo("");
    setNotaFiscal(null);
    setComprovante(null);
    setFiles([]);
    setSaving(false);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Recursos / despesas</h3>
        <Button type="button" variant="secondary" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Adicionar recurso
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-3 rounded-lg border border-slate-700/50 p-4">
          <Select
            label="Tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as ViagemRecursoTipo)}
            options={[
              { value: "abastecimento", label: "Abastecimento" },
              { value: "manutencao", label: "Manutenção" },
              { value: "outro", label: "Outro (imprevisto / reembolso)" },
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-2">
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
              value={realizadoEm}
              onChange={(e) => setRealizadoEm(e.target.value)}
              required
            />
          </div>
          {(tipo === "abastecimento" || tipo === "manutencao") && (
            <Input
              label="Quilometragem do veículo (opcional)"
              type="number"
              step="0.1"
              value={kmVeiculo}
              onChange={(e) => setKmVeiculo(e.target.value)}
              placeholder="Ex: 125430"
            />
          )}
          {tipo === "abastecimento" && (
            <Select
              label="Posto"
              value={postoId}
              onChange={(e) => setPostoId(e.target.value)}
              options={[
                { value: "", label: "Selecione ou deixe em branco" },
                ...postos.map((p) => ({ value: p.id, label: p.nome })),
              ]}
            />
          )}
          {tipo === "manutencao" && (
            <Select
              label="Oficina"
              value={oficinaId}
              onChange={(e) => setOficinaId(e.target.value)}
              options={[
                { value: "", label: "Selecione ou deixe em branco" },
                ...oficinas.map((o) => ({ value: o.id, label: o.nome })),
              ]}
            />
          )}
          <Textarea
            label="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={
              tipo === "outro"
                ? "Ex: pedágio pago pelo motorista — aguardando reembolso"
                : ""
            }
          />
          <AnexosFrotaCampos
            notaFiscal={notaFiscal}
            comprovante={comprovante}
            onNotaFiscalChange={setNotaFiscal}
            onComprovanteChange={setComprovante}
          />
          <FileUploadMultiple
            label="Outros anexos (opcional)"
            files={files}
            onChange={setFiles}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              Salvar recurso
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {recursos.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum recurso registrado.</p>
      ) : (
        <ul className="space-y-2">
          {recursos.map((r) => (
            <RecursoItem key={r.id} recurso={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RecursoItem({ recurso }: { recurso: Recurso }) {
  const [anexos, setAnexos] = useState<Anexo[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("viagem_anexos")
      .select("id, nome, file_name, storage_path")
      .eq("recurso_id", recurso.id)
      .then(({ data }) => setAnexos(data ?? []));
  }, [recurso.id]);

  const tipoLabel =
    recurso.tipo === "abastecimento"
      ? "Abastecimento"
      : recurso.tipo === "manutencao"
        ? "Manutenção"
        : "Outro";

  const local =
    recurso.postos?.nome ?? recurso.oficinas?.nome ?? null;

  return (
    <li className="rounded-lg border border-slate-700/40 bg-slate-800/30 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-cyan-300">{tipoLabel}</span>
        <span className="text-emerald-400">
          R$ {Number(recurso.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
      </div>
      <p className="text-slate-400">
        {new Date(recurso.realizado_em).toLocaleString("pt-BR")}
        {local && ` · ${local}`}
      </p>
      {recurso.descricao && <p className="mt-1 text-slate-300">{recurso.descricao}</p>}
      {anexos.length > 0 && (
        <ul className="mt-2 space-y-1">
          {anexos.map((a) => (
            <AnexoLink key={a.id} anexo={a} />
          ))}
        </ul>
      )}
    </li>
  );
}

function AnexoLink({ anexo }: { anexo: Anexo }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    getFileUrl(anexo.storage_path).then(setUrl);
  }, [anexo.storage_path]);

  return (
    <li>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-cyan-400 hover:underline">
          <FileText className="h-3 w-3" />
          {anexo.file_name}
        </a>
      ) : (
        <span className="flex items-center gap-1 text-slate-500">
          <FileText className="h-3 w-3" />
          {anexo.file_name}
        </span>
      )}
    </li>
  );
}
