"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { EntregaAutocomplete } from "@/components/ui/entrega-autocomplete";
import { FileUploadField } from "@/components/ui/file-upload";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { AptoBadge } from "@/components/operacional/apto-badge";
import {
  validarMotorista,
  validarVeiculo,
  ANEXOS_VIAGEM_CATEGORIAS,
  TIPOS_TRAJETO,
} from "@/lib/viagem-validation";
import { uploadFile } from "@/lib/storage";
import { calcularIdade } from "@/lib/utils";
import type { Motorista, Veiculo } from "@/types";
import { Plus, Trash2, FileText, AlertTriangle } from "lucide-react";

type AnexoRef = {
  categoria: string;
  nome: string;
  storage_path: string;
  file_name: string;
  mime_type?: string;
  origem: string;
};

type UploadSlot = {
  categoria: string;
  file: File | null;
};

function classificarAnexo(nome: string): "CNH" | "TOXICOLOGICO" | "CRLV" | null {
  const n = nome.toUpperCase();
  if (n.includes("CNH")) return "CNH";
  if (n.includes("TOXIC")) return "TOXICOLOGICO";
  if (n.includes("CRLV")) return "CRLV";
  return null;
}

export function ViagemForm({ onSaved }: { onSaved: () => void }) {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [motoristaId, setMotoristaId] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [motorista, setMotorista] = useState<Motorista | null>(null);
  const [veiculo, setVeiculo] = useState<Veiculo | null>(null);
  const [anexosAuto, setAnexosAuto] = useState<AnexoRef[]>([]);

  const [saidaEm, setSaidaEm] = useState("");
  const [chegadaEm, setChegadaEm] = useState("");
  const [localSaida, setLocalSaida] = useState("");
  const [entregas, setEntregas] = useState<string[]>([""]);
  const [tipoTrajeto, setTipoTrajeto] = useState("ida");
  const [pesoKg, setPesoKg] = useState("");
  const [valorMercadoria, setValorMercadoria] = useState("");
  const [descMercadoria, setDescMercadoria] = useState("");
  const [kmTotal, setKmTotal] = useState("");
  const [uploads, setUploads] = useState<UploadSlot[]>(
    ANEXOS_VIAGEM_CATEGORIAS.map((c) => ({ categoria: c, file: null }))
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const valMotorista = motorista ? validarMotorista(motorista) : null;
  const valVeiculo = veiculo ? validarVeiculo(veiculo) : null;
  const aptoGeral =
    !!valMotorista?.apto && !!valVeiculo?.apto && !!motoristaId && !!veiculoId;

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: m }, { data: v }] = await Promise.all([
        supabase.from("motoristas").select("*").order("nome_completo"),
        supabase.from("veiculos").select("*").order("nome"),
      ]);
      setMotoristas(m ?? []);
      setVeiculos(v ?? []);
    }
    load();
  }, []);

  useEffect(() => {
    async function loadSelecoes() {
      if (!motoristaId) {
        setMotorista(null);
        return;
      }
      const supabase = createClient();
      const { data: m } = await supabase
        .from("motoristas")
        .select("*")
        .eq("id", motoristaId)
        .single();
      setMotorista(m);

      const { data: anexosM } = await supabase
        .from("motorista_anexos")
        .select("*")
        .eq("motorista_id", motoristaId);

      const refsM =
        (anexosM ?? [])
          .map((a) => {
            const cat = classificarAnexo(a.nome);
            if (!cat || (cat !== "CNH" && cat !== "TOXICOLOGICO")) return null;
            return {
              categoria: cat,
              nome: a.nome,
              storage_path: a.storage_path,
              file_name: a.file_name,
              origem: "motorista",
            };
          })
          .filter(Boolean) as AnexoRef[];

      setAnexosAuto((prev) => [
        ...prev.filter((a) => a.origem !== "motorista"),
        ...refsM,
      ]);
    }
    loadSelecoes();
  }, [motoristaId]);

  useEffect(() => {
    async function loadVeiculo() {
      if (!veiculoId) {
        setVeiculo(null);
        return;
      }
      const supabase = createClient();
      const { data: v } = await supabase
        .from("veiculos")
        .select("*")
        .eq("id", veiculoId)
        .single();
      setVeiculo(v);

      const { data: anexosV } = await supabase
        .from("veiculo_anexos")
        .select("*")
        .eq("veiculo_id", veiculoId);

      const refsV =
        (anexosV ?? [])
          .map((a) => {
            const cat = classificarAnexo(a.nome);
            if (cat !== "CRLV") return null;
            return {
              categoria: cat,
              nome: a.nome,
              storage_path: a.storage_path,
              file_name: a.file_name,
              origem: "veiculo",
            };
          })
          .filter(Boolean) as AnexoRef[];

      setAnexosAuto((prev) => [
        ...prev.filter((a) => a.origem !== "veiculo"),
        ...refsV,
      ]);
    }
    loadVeiculo();
  }, [veiculoId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!aptoGeral || !motorista || !veiculo) {
      setError(
        "Motorista ou veículo inapto. Corrija o cadastro ou selecione outro."
      );
      return;
    }

    const locaisEntrega = entregas.map((l) => l.trim()).filter(Boolean);
    if (!localSaida.trim() || locaisEntrega.length === 0) {
      setError("Informe o local de saída e ao menos um local de entrega.");
      return;
    }

    if (!saidaEm || !chegadaEm) {
      setError("Informe data/hora de saída e chegada prevista.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: viagem, error: viagemErr } = await supabase
      .from("viagens")
      .insert({
        motorista_id: motoristaId,
        veiculo_id: veiculoId,
        saida_em: new Date(saidaEm).toISOString(),
        chegada_prevista_em: new Date(chegadaEm).toISOString(),
        local_saida: localSaida.trim(),
        tipo_trajeto: tipoTrajeto,
        peso_kg: pesoKg ? parseFloat(pesoKg) : null,
        valor_mercadoria: valorMercadoria ? parseFloat(valorMercadoria) : null,
        descricao_mercadoria: descMercadoria || null,
        km_total: kmTotal ? parseFloat(kmTotal) : null,
        status: "EM ANDAMENTO",
        motorista_apto: true,
        veiculo_apto: true,
        created_by: user?.id,
      })
      .select("id")
      .single();

    if (viagemErr || !viagem) {
      setError(viagemErr?.message ?? "Erro ao salvar viagem");
      setSaving(false);
      return;
    }

    await supabase.from("viagem_entregas").insert(
      locaisEntrega.map((local, i) => ({
        viagem_id: viagem.id,
        ordem: i + 1,
        local_entrega: local,
      }))
    );

    const anexosInsert = anexosAuto.map((a) => ({
      viagem_id: viagem.id,
      categoria: a.categoria,
      nome: a.nome,
      storage_path: a.storage_path,
      file_name: a.file_name,
      mime_type: "application/pdf",
      origem: a.origem,
    }));

    for (const slot of uploads) {
      if (!slot.file) continue;
      const up = await uploadFile(slot.file, `viagens/${viagem.id}`);
      if (up) {
        anexosInsert.push({
          viagem_id: viagem.id,
          categoria: slot.categoria,
          nome: slot.categoria,
          storage_path: up.path,
          file_name: up.fileName,
          mime_type: up.mimeType,
          origem: "upload",
        });
      }
    }

    if (anexosInsert.length) {
      await supabase.from("viagem_anexos").insert(anexosInsert);
    }

    setSaving(false);
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4 rounded-xl border border-slate-700/60 p-5">
        <h2 className="text-lg font-semibold text-cyan-400">1. Motorista e veículo</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Motorista"
            value={motoristaId}
            onChange={(e) => setMotoristaId(e.target.value)}
            options={[
              { value: "", label: "Selecione..." },
              ...motoristas.map((m) => ({
                value: m.id,
                label: m.nome_completo,
              })),
            ]}
          />
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
        </div>

        {motorista && valMotorista && (
          <div
            className={`rounded-lg border p-4 ${valMotorista.apto ? "border-emerald-800/50 bg-emerald-950/20" : "border-red-800/50 bg-red-950/20"}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium">{motorista.nome_completo}</h3>
              <AptoBadge apto={valMotorista.apto} />
            </div>
            <dl className="grid gap-1 text-sm text-slate-300 sm:grid-cols-2">
              <div>CPF: {motorista.cpf}</div>
              <div>Idade: {calcularIdade(motorista.data_nascimento) ?? "—"} anos</div>
              <div>CNH: {motorista.cnh_numero ?? "—"} ({motorista.cnh_categoria ?? "—"})</div>
              <div>Venc. CNH: {motorista.cnh_vencimento ?? "—"}</div>
              <div>Toxicológico venc.: {motorista.toxicologico_vencimento ?? "—"}</div>
              <div>Tel: {motorista.telefone ?? "—"}</div>
            </dl>
            {!valMotorista.apto && (
              <div className="mt-3 flex items-start gap-2 text-sm text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  {valMotorista.problemas.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                  <Link href="/cadastro/motoristas" className="mt-1 inline-block text-cyan-400 underline">
                    Corrigir no cadastro de motoristas
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {veiculo && valVeiculo && (
          <div
            className={`rounded-lg border p-4 ${valVeiculo.apto ? "border-emerald-800/50 bg-emerald-950/20" : "border-red-800/50 bg-red-950/20"}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium">
                {veiculo.nome} — {veiculo.placa}
              </h3>
              <AptoBadge apto={valVeiculo.apto} />
            </div>
            <dl className="grid gap-1 text-sm text-slate-300 sm:grid-cols-2">
              <div>Chassi: {veiculo.chassi ?? "—"}</div>
              <div>Ano/Modelo: {veiculo.ano_modelo ?? "—"}</div>
              <div>RENAVAM: {veiculo.renavam ?? "—"}</div>
              <div>Venc. CRLV: {veiculo.crlv_vencimento ?? "—"}</div>
              <div>Venc. IPVA: {veiculo.ipva_vencimento ?? "—"}</div>
              <div>
                Status: {veiculo.financiado ? "Financiado" : veiculo.quitado ? "Quitado" : "—"}
              </div>
            </dl>
            {!valVeiculo.apto && (
              <div className="mt-3 flex items-start gap-2 text-sm text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  {valVeiculo.problemas.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                  <Link href="/cadastro/veiculos" className="mt-1 inline-block text-cyan-400 underline">
                    Corrigir no cadastro de veículos
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {anexosAuto.length > 0 && (
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
            <p className="mb-2 text-sm font-medium text-slate-300">
              Anexos vinculados automaticamente
            </p>
            <ul className="space-y-1 text-sm text-slate-400">
              {anexosAuto.map((a) => (
                <li key={`${a.origem}-${a.categoria}`} className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-cyan-500" />
                  {a.categoria}: {a.file_name} ({a.origem})
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {!aptoGeral && (motoristaId || veiculoId) && (
        <p className="rounded-lg bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          Resolva as pendências acima para liberar o cadastro da viagem.
        </p>
      )}

      <fieldset
        disabled={!aptoGeral}
        className="space-y-8 disabled:opacity-50"
      >
        <section className="space-y-4 rounded-xl border border-slate-700/60 p-5">
          <h2 className="text-lg font-semibold text-cyan-400">2. Dados da viagem</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Data e hora de saída"
              type="datetime-local"
              value={saidaEm}
              onChange={(e) => setSaidaEm(e.target.value)}
              required
            />
            <Input
              label="Data e hora prevista de chegada"
              type="datetime-local"
              value={chegadaEm}
              onChange={(e) => setChegadaEm(e.target.value)}
              required
            />
            <EntregaAutocomplete
              label="Local de saída"
              value={localSaida}
              onChange={setLocalSaida}
              required
              className="sm:col-span-2"
              placeholder="Local de saída ou busque cliente/fornecedor"
            />
            <Select
              label="Tipo de viagem"
              value={tipoTrajeto}
              onChange={(e) => setTipoTrajeto(e.target.value)}
              options={TIPOS_TRAJETO.map((t) => ({ value: t.value, label: t.label }))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">Locais de entrega</span>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEntregas([...entregas, ""])}
              >
                <Plus className="h-4 w-4" />
                Adicionar local
              </Button>
            </div>
            {entregas.map((loc, i) => (
              <div key={i} className="flex gap-2">
                <EntregaAutocomplete
                  label={`Entrega ${i + 1}`}
                  value={loc}
                  onChange={(val) => {
                    const next = [...entregas];
                    next[i] = val;
                    setEntregas(next);
                  }}
                  className="flex-1"
                />
                {entregas.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEntregas(entregas.filter((_, j) => j !== i))}
                    className="mt-6"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              label="Peso do caminhão (kg)"
              type="number"
              step="0.01"
              value={pesoKg}
              onChange={(e) => setPesoKg(e.target.value)}
            />
            <Input
              label="Valor da mercadoria (R$)"
              type="number"
              step="0.01"
              value={valorMercadoria}
              onChange={(e) => setValorMercadoria(e.target.value)}
            />
            <Input
              label="KM total da viagem"
              type="number"
              step="0.1"
              value={kmTotal}
              onChange={(e) => setKmTotal(e.target.value)}
            />
          </div>
          <Textarea
            label="Descrição da mercadoria"
            value={descMercadoria}
            onChange={(e) => setDescMercadoria(e.target.value)}
          />
        </section>

        <section className="space-y-4 rounded-xl border border-slate-700/60 p-5">
          <h2 className="text-lg font-semibold text-cyan-400">3. Anexos da viagem</h2>
          <p className="text-sm text-slate-400">
            CNH, Toxicológico e CRLV são vinculados automaticamente do cadastro.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {uploads.map((slot, i) => (
              <FileUploadField
                key={slot.categoria}
                label={slot.categoria}
                file={slot.file}
                onChange={(file) => {
                  const next = [...uploads];
                  next[i] = { ...slot, file };
                  setUploads(next);
                }}
              />
            ))}
          </div>
        </section>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" disabled={saving || !aptoGeral}>
          {saving ? "Salvando viagem..." : "Cadastrar viagem"}
        </Button>
      </fieldset>
    </form>
  );
}
