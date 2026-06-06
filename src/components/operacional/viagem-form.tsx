"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { BrNumberInput } from "@/components/ui/br-number-input";
import { EntregaAutocomplete } from "@/components/ui/entrega-autocomplete";
import { MotoristaAutocomplete } from "@/components/ui/motorista-autocomplete";
import { FileUploadField, FileUploadMultiple } from "@/components/ui/file-upload";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { AptoBadge } from "@/components/operacional/apto-badge";
import {
  validarMotorista,
  validarVeiculo,
  ANEXOS_VIAGEM_CATEGORIAS_UNICAS,
  ANEXOS_VIAGEM_CATEGORIAS_MULTIPLAS,
  isFrota,
  labelVinculo,
  VEICULO_TIPO_OPCOES,
  TIPOS_TRAJETO,
} from "@/lib/viagem-validation";
import { uploadFile } from "@/lib/storage";
import { calcularIdade } from "@/lib/utils";
import { isoParaDatetimeLocal, type ViagemParaEdicao } from "@/lib/viagem-crud";
import { syncFechamentoViagem } from "@/lib/fechamento-viagem";
import { statusGeraFechamento } from "@/lib/viagem-status";
import {
  fetchLitrosTotaisVeiculo,
  type LitrosTanqueVeiculo,
} from "@/lib/litros-frota-veiculo";
import { parseBrNumber, rawNumberStringToBrInput } from "@/lib/number-format";
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

type VeiculoSelecionado = {
  veiculo: Veiculo;
  validacao: ReturnType<typeof validarVeiculo>;
};

function classificarAnexo(nome: string): "CNH" | "TOXICOLOGICO" | "CRLV" | null {
  const n = nome.toUpperCase();
  if (n.includes("CNH")) return "CNH";
  if (n.includes("TOXIC")) return "TOXICOLOGICO";
  if (n.includes("CRLV")) return "CRLV";
  return null;
}

export function ViagemForm({
  viagem,
  onSaved,
  onCancel,
}: {
  viagem?: ViagemParaEdicao;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const isEdit = !!viagem?.id;
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [motoristaId, setMotoristaId] = useState("");
  const [veiculoIds, setVeiculoIds] = useState<string[]>([]);
  const [motorista, setMotorista] = useState<Motorista | null>(null);
  const [veiculosSelecionados, setVeiculosSelecionados] = useState<VeiculoSelecionado[]>([]);
  const [anexosAuto, setAnexosAuto] = useState<AnexoRef[]>([]);

  const [saidaEm, setSaidaEm] = useState("");
  const [chegadaEm, setChegadaEm] = useState("");
  const [localSaida, setLocalSaida] = useState("");
  const [entregas, setEntregas] = useState<string[]>([""]);
  const [tipoTrajeto, setTipoTrajeto] = useState("ida");
  const [pesoKg, setPesoKg] = useState("");
  const [valorMercadoria, setValorMercadoria] = useState("");
  const [valorFrete, setValorFrete] = useState("");
  const [numeroCte, setNumeroCte] = useState("");
  const [descMercadoria, setDescMercadoria] = useState("");
  const [kmTotal, setKmTotal] = useState("");
  const [tanqueVeiculo, setTanqueVeiculo] = useState<LitrosTanqueVeiculo | null>(null);
  const [uploads, setUploads] = useState<UploadSlot[]>(
    ANEXOS_VIAGEM_CATEGORIAS_UNICAS.map((c) => ({ categoria: c, file: null }))
  );
  const [uploadsMultiplos, setUploadsMultiplos] = useState<Record<string, File[]>>({
    ROMANEIO: [],
    NOTAS_FISCAIS: [],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const valMotorista = motorista ? validarMotorista(motorista) : null;
  const todosVeiculosAptos =
    veiculosSelecionados.length > 0 &&
    veiculosSelecionados.every((v) => v.validacao.apto);
  const aptoGeral =
    !!valMotorista?.apto && todosVeiculosAptos && !!motoristaId && veiculoIds.length > 0;

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
    if (!viagem) return;
    setMotoristaId(viagem.motorista_id);
    setVeiculoIds(viagem.veiculo_ids);
    setSaidaEm(isoParaDatetimeLocal(viagem.saida_em));
    setChegadaEm(isoParaDatetimeLocal(viagem.chegada_prevista_em));
    setLocalSaida(viagem.local_saida);
    setEntregas(
      viagem.entregas.length
        ? viagem.entregas
            .sort((a, b) => a.ordem - b.ordem)
            .map((e) => e.local_entrega)
        : [""]
    );
    setTipoTrajeto(viagem.tipo_trajeto);
    setPesoKg(rawNumberStringToBrInput(viagem.peso_kg, 2));
    setValorMercadoria(rawNumberStringToBrInput(viagem.valor_mercadoria, 2));
    setValorFrete(rawNumberStringToBrInput(viagem.valor_frete, 2));
    setNumeroCte(viagem.numero_cte ?? "");
    setDescMercadoria(viagem.descricao_mercadoria ?? "");
    setKmTotal(rawNumberStringToBrInput(viagem.km_total, 0));
    setUploads(ANEXOS_VIAGEM_CATEGORIAS_UNICAS.map((c) => ({ categoria: c, file: null })));
    setUploadsMultiplos({ ROMANEIO: [], NOTAS_FISCAIS: [] });
  }, [viagem]);

  function toggleVeiculo(id: string) {
    setVeiculoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function labelTipoVeiculo(tipo: Veiculo["tipo"] | undefined) {
    return VEICULO_TIPO_OPCOES.find((o) => o.value === tipo)?.label ?? "";
  }

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

      const refsM: AnexoRef[] = [];
      if (m && isFrota(m.vinculo)) {
        const { data: anexosM } = await supabase
          .from("motorista_anexos")
          .select("*")
          .eq("motorista_id", motoristaId);

        for (const a of anexosM ?? []) {
          const cat = classificarAnexo(a.nome);
          if (!cat || (cat !== "CNH" && cat !== "TOXICOLOGICO")) continue;
          refsM.push({
            categoria: cat,
            nome: a.nome,
            storage_path: a.storage_path,
            file_name: a.file_name,
            origem: "motorista",
          });
        }
      }

      setAnexosAuto((prev) => [
        ...prev.filter((a) => a.origem !== "motorista"),
        ...refsM,
      ]);
    }
    loadSelecoes();
  }, [motoristaId]);

  useEffect(() => {
    async function loadVeiculos() {
      if (!veiculoIds.length) {
        setVeiculosSelecionados([]);
        setAnexosAuto((prev) => prev.filter((a) => a.origem !== "veiculo"));
        return;
      }
      const supabase = createClient();
      const { data: lista } = await supabase
        .from("veiculos")
        .select("*")
        .in("id", veiculoIds);

      const porId = new Map((lista ?? []).map((v) => [v.id, v as Veiculo]));
      const ordenados = veiculoIds
        .map((id) => porId.get(id))
        .filter((v): v is Veiculo => !!v);

      setVeiculosSelecionados(
        ordenados.map((veiculo) => ({
          veiculo,
          validacao: validarVeiculo(veiculo),
        }))
      );

      const refsV: AnexoRef[] = [];
      for (const veiculo of ordenados) {
        const { data: anexosV } = await supabase
          .from("veiculo_anexos")
          .select("*")
          .eq("veiculo_id", veiculo.id);

        for (const a of anexosV ?? []) {
          const cat = classificarAnexo(a.nome);
          if (cat !== "CRLV") continue;
          refsV.push({
            categoria: cat,
            nome: a.nome,
            storage_path: a.storage_path,
            file_name: a.file_name,
            origem: `veiculo:${veiculo.id}`,
          });
        }
      }

      setAnexosAuto((prev) => [
        ...prev.filter((a) => !a.origem.startsWith("veiculo")),
        ...refsV,
      ]);
    }
    loadVeiculos();
  }, [veiculoIds]);

  useEffect(() => {
    const veiculoPrincipalId = veiculoIds[0];
    if (!veiculoPrincipalId) {
      setTanqueVeiculo(null);
      return;
    }
    const antesDe = saidaEm ? new Date(saidaEm).toISOString() : undefined;
    fetchLitrosTotaisVeiculo(veiculoPrincipalId, antesDe).then(setTanqueVeiculo);
  }, [veiculoIds, saidaEm]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!aptoGeral || !motorista || veiculosSelecionados.length === 0) {
      setError(
        "Motorista ou veículo(s) inapto(s). Corrija o cadastro ou selecione outro(s)."
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

    const veiculoPrincipalId = veiculoIds[0];

    const payloadViagem = {
      motorista_id: motoristaId,
      veiculo_id: veiculoPrincipalId,
      saida_em: new Date(saidaEm).toISOString(),
      chegada_prevista_em: new Date(chegadaEm).toISOString(),
      local_saida: localSaida.trim(),
      tipo_trajeto: tipoTrajeto,
      peso_kg: parseBrNumber(pesoKg),
      valor_mercadoria: parseBrNumber(valorMercadoria),
      valor_frete: parseBrNumber(valorFrete),
      numero_cte: numeroCte.trim() || null,
      descricao_mercadoria: descMercadoria || null,
      km_total: parseBrNumber(kmTotal),
      motorista_apto: true,
      veiculo_apto: true,
    };

    let viagemId = viagem?.id;

    if (isEdit && viagemId) {
      const { error: upErr } = await supabase
        .from("viagens")
        .update(payloadViagem)
        .eq("id", viagemId);

      if (upErr) {
        setError(upErr.message);
        setSaving(false);
        return;
      }

      await supabase.from("viagem_entregas").delete().eq("viagem_id", viagemId);
    } else {
      const { data: nova, error: viagemErr } = await supabase
        .from("viagens")
        .insert({
          ...payloadViagem,
          status: "EM ANDAMENTO",
          created_by: user?.id,
        })
        .select("id")
        .single();

      if (viagemErr || !nova) {
        setError(viagemErr?.message ?? "Erro ao salvar viagem");
        setSaving(false);
        return;
      }
      viagemId = nova.id;
    }

    if (!viagemId) {
      setError("Erro ao identificar viagem");
      setSaving(false);
      return;
    }

    await supabase.from("viagem_entregas").insert(
      locaisEntrega.map((local, i) => ({
        viagem_id: viagemId,
        ordem: i + 1,
        local_entrega: local,
      }))
    );

    await supabase.from("viagem_veiculos").delete().eq("viagem_id", viagemId);
    await supabase.from("viagem_veiculos").insert(
      veiculoIds.map((veiculo_id, i) => ({
        viagem_id: viagemId,
        veiculo_id,
        ordem: i + 1,
      }))
    );

    const anexosInsert: {
      viagem_id: string;
      categoria: string;
      nome: string;
      storage_path: string;
      file_name: string;
      mime_type: string;
      origem: string;
    }[] = [];

    if (!isEdit) {
      for (const a of anexosAuto) {
        anexosInsert.push({
          viagem_id: viagemId,
          categoria: a.categoria,
          nome: a.nome,
          storage_path: a.storage_path,
          file_name: a.file_name,
          mime_type: "application/pdf",
          origem: a.origem,
        });
      }
    }

    for (const slot of uploads) {
      if (!slot.file) continue;
      const up = await uploadFile(slot.file, `viagens/${viagemId}`);
      if (up) {
        anexosInsert.push({
          viagem_id: viagemId,
          categoria: slot.categoria,
          nome: slot.categoria,
          storage_path: up.path,
          file_name: up.fileName,
          mime_type: up.mimeType,
          origem: "upload",
        });
      }
    }

    for (const categoria of ANEXOS_VIAGEM_CATEGORIAS_MULTIPLAS) {
      const arquivos = uploadsMultiplos[categoria] ?? [];
      for (const file of arquivos) {
        const up = await uploadFile(file, `viagens/${viagemId}`);
        if (up) {
          anexosInsert.push({
            viagem_id: viagemId,
            categoria,
            nome: categoria,
            storage_path: up.path,
            file_name: up.fileName,
            mime_type: up.mimeType,
            origem: "upload",
          });
        }
      }
    }

    if (anexosInsert.length) {
      await supabase.from("viagem_anexos").insert(anexosInsert);
    }

    if (isEdit && viagem?.status && statusGeraFechamento(viagem.status)) {
      await syncFechamentoViagem(viagemId);
    }

    setSaving(false);
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4 rounded-xl border border-slate-700/60 p-5">
        <h2 className="text-lg font-semibold text-cyan-400">1. Motorista e veículos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <MotoristaAutocomplete
            label="Motorista"
            motoristas={motoristas}
            motoristaId={motoristaId}
            onMotoristaIdChange={setMotoristaId}
            required
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-300">
            Veículos da viagem (selecione quantos precisar: cavalo, carretas, etc.)
          </p>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-700/60 bg-slate-800/30 p-3">
            {veiculos.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum veículo cadastrado.</p>
            ) : (
              veiculos.map((v) => {
                const tipoLabel = labelTipoVeiculo(v.tipo);
                const checked = veiculoIds.includes(v.id);
                return (
                  <label
                    key={v.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition ${
                      checked
                        ? "border-cyan-600/50 bg-cyan-950/30"
                        : "border-slate-700/50 hover:border-slate-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleVeiculo(v.id)}
                      className="rounded border-slate-600"
                    />
                    <span className="text-sm text-slate-200">
                      {v.nome} — {v.placa}
                      <span className="ml-2 text-xs text-slate-400">
                        ({labelVinculo(v.vinculo)}
                        {tipoLabel ? ` · ${tipoLabel}` : ""})
                      </span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
          {veiculoIds.length > 0 && (
            <p className="text-xs text-slate-400">
              {veiculoIds.length} veículo(s) selecionado(s)
            </p>
          )}
        </div>

        {motorista && valMotorista && (
          <div
            className={`rounded-lg border p-4 ${valMotorista.apto ? "border-emerald-800/50 bg-emerald-950/20" : "border-red-800/50 bg-red-950/20"}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium">
                {motorista.nome_completo}
                <span className="ml-2 text-xs font-normal text-slate-400">
                  ({labelVinculo(motorista.vinculo)})
                </span>
              </h3>
              <AptoBadge
                apto={valMotorista.apto}
                label={isFrota(motorista.vinculo) ? undefined : "Terceiro"}
              />
            </div>
            <dl className="grid gap-1 text-sm text-slate-300 sm:grid-cols-2">
              <div>CPF: {motorista.cpf}</div>
              <div>
                Idade:{" "}
                {motorista.data_nascimento
                  ? `${calcularIdade(motorista.data_nascimento) ?? "—"} anos`
                  : "—"}
              </div>
              <div>Tel: {motorista.telefone ?? "—"}</div>
              {isFrota(motorista.vinculo) ? (
                <>
                  <div>CNH: {motorista.cnh_numero ?? "—"} ({motorista.cnh_categoria ?? "—"})</div>
                  <div>Venc. CNH: {motorista.cnh_vencimento ?? "—"}</div>
                  <div>Toxicológico venc.: {motorista.toxicologico_vencimento ?? "—"}</div>
                </>
              ) : (
                <div className="sm:col-span-2 text-slate-400">
                  Documentação de frota não exigida para motorista terceiro.
                </div>
              )}
            </dl>
            {!valMotorista.apto && isFrota(motorista.vinculo) && (
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

        {veiculosSelecionados.map(({ veiculo, validacao }) => (
          <div
            key={veiculo.id}
            className={`rounded-lg border p-4 ${validacao.apto ? "border-emerald-800/50 bg-emerald-950/20" : "border-red-800/50 bg-red-950/20"}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium">
                {veiculo.nome} — {veiculo.placa}
                <span className="ml-2 text-xs font-normal text-slate-400">
                  ({labelVinculo(veiculo.vinculo)}
                  {veiculo.tipo ? ` · ${labelTipoVeiculo(veiculo.tipo)}` : ""})
                </span>
              </h3>
              <AptoBadge
                apto={validacao.apto}
                label={isFrota(veiculo.vinculo) ? undefined : "Terceiro"}
              />
            </div>
            <dl className="grid gap-1 text-sm text-slate-300 sm:grid-cols-2">
              <div>Chassi: {veiculo.chassi ?? "—"}</div>
              <div>Ano/Modelo: {veiculo.ano_modelo ?? "—"}</div>
              <div>RENAVAM: {veiculo.renavam ?? "—"}</div>
              {isFrota(veiculo.vinculo) && (
                <>
                  <div>Venc. CRLV: {veiculo.crlv_vencimento ?? "—"}</div>
                  <div>Venc. IPVA: {veiculo.ipva_vencimento ?? "—"}</div>
                </>
              )}
              <div>
                Status: {veiculo.financiado ? "Financiado" : veiculo.quitado ? "Quitado" : "—"}
              </div>
            </dl>
            {!validacao.apto && isFrota(veiculo.vinculo) && (
              <div className="mt-3 flex items-start gap-2 text-sm text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  {validacao.problemas.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                  <Link href="/cadastro/veiculos" className="mt-1 inline-block text-cyan-400 underline">
                    Corrigir no cadastro de veículos
                  </Link>
                </div>
              </div>
            )}
          </div>
        ))}

        {anexosAuto.length > 0 && (
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
            <p className="mb-2 text-sm font-medium text-slate-300">
              Anexos vinculados automaticamente
            </p>
            <ul className="space-y-1 text-sm text-slate-400">
              {anexosAuto.map((a) => (
                <li
                  key={`${a.origem}-${a.categoria}-${a.file_name}`}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4 text-cyan-500" />
                  {a.categoria}: {a.file_name} ({a.origem})
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {!aptoGeral && (motoristaId || veiculoIds.length > 0) && (
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
              label="Local de saída (fornecedor)"
              value={localSaida}
              onChange={setLocalSaida}
              required
              className="sm:col-span-2"
              tipoParceiro="fornecedor"
              placeholder="Digite o nome do fornecedor"
            />
            <Select
              label="Tipo de viagem"
              value={tipoTrajeto}
              onChange={(e) => setTipoTrajeto(e.target.value)}
              options={TIPOS_TRAJETO.map((t) => ({ value: t.value, label: t.label }))}
            />
            <Input
              label="Número do CTE"
              value={numeroCte}
              onChange={(e) => setNumeroCte(e.target.value)}
              placeholder="Ex: 123456789"
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
            <BrNumberInput
              label="Peso do caminhão (kg)"
              decimalPlaces={2}
              value={pesoKg}
              onChange={setPesoKg}
            />
            <BrNumberInput
              label="Valor da mercadoria (R$)"
              decimalPlaces={2}
              value={valorMercadoria}
              onChange={setValorMercadoria}
            />
            <BrNumberInput
              label="Valor do frete (R$)"
              decimalPlaces={2}
              value={valorFrete}
              onChange={setValorFrete}
              placeholder="Valor a ser pago pelo frete"
            />
            <BrNumberInput
              label="KM total da viagem"
              decimalPlaces={0}
              value={kmTotal}
              onChange={setKmTotal}
            />
          </div>
          {veiculoIds.length > 0 && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                tanqueVeiculo
                  ? "border-cyan-800/50 bg-cyan-950/20 text-cyan-100"
                  : "border-amber-800/50 bg-amber-950/20 text-amber-100"
              }`}
            >
              {tanqueVeiculo ? (
                <>
                  <span className="font-medium">Tanque do veículo (Frota → Abastecimentos):</span>{" "}
                  {tanqueVeiculo.litrosTotais.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  L
                  <span className="mt-1 block text-xs opacity-80">
                    Último registro em{" "}
                    {new Date(tanqueVeiculo.dataHora).toLocaleString("pt-BR")}
                    {saidaEm ? " (antes da saída da viagem)" : ""}. Abastecimentos extras na viagem
                    entram no consumo médio no fechamento.
                  </span>
                </>
              ) : (
                <>
                  Nenhum abastecimento em Frota com <strong>litros totais</strong> para o veículo
                  principal. Cadastre em Frota → Abastecimentos antes de iniciar a viagem.
                </>
              )}
            </div>
          )}
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
            Romaneios e notas fiscais aceitam vários arquivos.
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
            {ANEXOS_VIAGEM_CATEGORIAS_MULTIPLAS.map((categoria) => (
              <FileUploadMultiple
                key={categoria}
                label={categoria === "NOTAS_FISCAIS" ? "Notas fiscais" : "Romaneios"}
                files={uploadsMultiplos[categoria] ?? []}
                onChange={(files) =>
                  setUploadsMultiplos((prev) => ({ ...prev, [categoria]: files }))
                }
                hint="PDF ou imagem — adicione quantos arquivos precisar"
              />
            ))}
          </div>
        </section>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex flex-wrap gap-3">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={saving || !aptoGeral}>
            {saving
              ? "Salvando..."
              : isEdit
                ? "Salvar alterações"
                : "Cadastrar viagem"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
