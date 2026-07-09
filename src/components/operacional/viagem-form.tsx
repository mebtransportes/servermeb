"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { BrNumberInput } from "@/components/ui/br-number-input";
import { EntregaAutocomplete } from "@/components/ui/entrega-autocomplete";
import { MotoristaAutocomplete } from "@/components/ui/motorista-autocomplete";
import { VeiculosViagemPicker } from "@/components/ui/veiculos-viagem-picker";
import { FileUploadMultiple } from "@/components/ui/file-upload";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { AptoBadge } from "@/components/operacional/apto-badge";
import {
  validarMotorista,
  validarVeiculo,
  ANEXOS_VIAGEM_CATEGORIAS_MULTIPLAS,
  isFrota,
  labelVinculo,
  VEICULO_TIPO_OPCOES,
  TIPOS_TRAJETO,
  VIAGEM_STATUS,
} from "@/lib/viagem-validation";
import { VIAGEM_STATUS_LABEL } from "@/lib/viagem-status";
import { uploadFile } from "@/lib/storage";
import { calcularIdade, cn, mebFormSection, mebFormSubsection } from "@/lib/utils";
import { isoParaDatetimeLocal, buscarViagemComMesmoCte, type ViagemParaEdicao } from "@/lib/viagem-crud";
import { formatarDataHoraBr } from "@/lib/frota-filters";
import { mebAlert } from "@/lib/meb-dialog";
import { syncFechamentoViagem } from "@/lib/fechamento-viagem";
import { resolverDataPagamentoTerceiro } from "@/lib/viagem-pagamento-terceiro";
import { statusGeraFechamento } from "@/lib/viagem-status";
import { formatarLocaisParceiros } from "@/lib/viagem-parceiros-viagem";
import {
  fetchLitrosTotaisVeiculo,
  type LitrosTanqueVeiculo,
} from "@/lib/litros-frota-veiculo";
import {
  fetchUltimoKmVeiculo,
  syncKmInicialAoAbrirViagem,
  type UltimoKmVeiculo,
} from "@/lib/veiculo-km";
import { parseBrNumber, rawNumberStringToBrInput, formatKmBr, roundKm } from "@/lib/number-format";
import type { Motorista, Veiculo, ViagemStatus } from "@/types";
import { Plus, Trash2, FileText, AlertTriangle } from "lucide-react";

type AnexoRef = {
  categoria: string;
  nome: string;
  storage_path: string;
  file_name: string;
  mime_type?: string;
  origem: string;
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

function criarUploadsMultiplosVazios(): Record<string, File[]> {
  return Object.fromEntries(
    ANEXOS_VIAGEM_CATEGORIAS_MULTIPLAS.map((c) => [c, [] as File[]])
  );
}

function labelAnexoMultiplo(categoria: string): string {
  const labels: Record<string, string> = {
    NOTAS_FISCAIS: "Notas fiscais",
    ROMANEIO: "Romaneios",
    CTE: "CT-e",
    CIOT: "CIOT",
    MDFE: "Manifesto (MDF-e)",
    ENTREGAS: "Entregas",
  };
  return labels[categoria] ?? categoria;
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

  const [contratacaoEm, setContratacaoEm] = useState("");
  const [saidaEm, setSaidaEm] = useState("");
  const [chegadaEm, setChegadaEm] = useState("");
  const [fornecedores, setFornecedores] = useState<string[]>([""]);
  const [entregas, setEntregas] = useState<string[]>([""]);
  const [tipoTrajeto, setTipoTrajeto] = useState("ida");
  const [pesoKg, setPesoKg] = useState("");
  const [valorMercadoria, setValorMercadoria] = useState("");
  const [valorFrete, setValorFrete] = useState("");
  const [dataPagamentoTerceiro, setDataPagamentoTerceiro] = useState("");
  const [numeroCte, setNumeroCte] = useState("");
  const [descMercadoria, setDescMercadoria] = useState("");
  const [tanqueVeiculo, setTanqueVeiculo] = useState<LitrosTanqueVeiculo | null>(null);
  const [ultimoKmVeiculo, setUltimoKmVeiculo] = useState<UltimoKmVeiculo | null>(null);
  const [uploadsMultiplos, setUploadsMultiplos] = useState<Record<string, File[]>>(
    criarUploadsMultiplosVazios
  );

  const [saving, setSaving] = useState(false);
  const salvandoRef = useRef(false);
  const [error, setError] = useState("");
  const [cadastroAgendado, setCadastroAgendado] = useState(false);
  const [statusViagem, setStatusViagem] = useState<ViagemStatus>("EM CARREGAMENTO");

  const emModoAgendada = cadastroAgendado || statusViagem === "AGENDADA";
  const exigeProgramacao = !emModoAgendada;

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
    if (viagem.status === "AGENDADA" && viagem.id) {
      syncKmInicialAoAbrirViagem(viagem.id);
    }
    setMotoristaId(viagem.motorista_id);
    setVeiculoIds(viagem.veiculo_ids);
    setContratacaoEm(
      viagem.data_contratacao ? isoParaDatetimeLocal(viagem.data_contratacao) : ""
    );
    setSaidaEm(viagem.saida_em ? isoParaDatetimeLocal(viagem.saida_em) : "");
    setStatusViagem(viagem.status as ViagemStatus);
    setCadastroAgendado(viagem.status === "AGENDADA");
    setChegadaEm(
      viagem.chegada_prevista_em ? isoParaDatetimeLocal(viagem.chegada_prevista_em) : ""
    );
    setFornecedores(
      viagem.fornecedores.length
        ? viagem.fornecedores
            .sort((a, b) => a.ordem - b.ordem)
            .map((f) => f.local_fornecedor)
        : viagem.local_saida
          ? [viagem.local_saida]
          : [""]
    );
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
    setDataPagamentoTerceiro(resolverDataPagamentoTerceiro(viagem) ?? "");
    setNumeroCte(viagem.numero_cte ?? "");
    setDescMercadoria(viagem.descricao_mercadoria ?? "");
    setUploadsMultiplos(criarUploadsMultiplosVazios());
  }, [viagem]);

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
      setUltimoKmVeiculo(null);
      return;
    }
    const antesDe = saidaEm ? new Date(saidaEm).toISOString() : undefined;
    fetchLitrosTotaisVeiculo(veiculoPrincipalId, antesDe).then(setTanqueVeiculo);
    // KM inicial sempre do abastecimento mais recente (mesmo com viagem anterior em aberto)
    fetchUltimoKmVeiculo(veiculoPrincipalId).then(setUltimoKmVeiculo);
  }, [veiculoIds, saidaEm]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (salvandoRef.current) return;
    setError("");

    if (!aptoGeral || !motorista || veiculosSelecionados.length === 0) {
      setError(
        "Motorista ou veículo(s) inapto(s). Corrija o cadastro ou selecione outro(s)."
      );
      return;
    }

    const locaisFornecedor = fornecedores.map((l) => l.trim()).filter(Boolean);
    const locaisEntrega = entregas.map((l) => l.trim()).filter(Boolean);

    if (!contratacaoEm) {
      setError("Informe a data e hora de contratação.");
      return;
    }

    if (exigeProgramacao) {
      if (locaisFornecedor.length === 0 || locaisEntrega.length === 0) {
        setError("Informe ao menos um fornecedor (origem) e um local de entrega.");
        return;
      }

      if (!saidaEm) {
        setError("Informe data/hora de saída.");
        return;
      }

      const valorCargaNum = parseBrNumber(valorMercadoria) ?? 0;
      if (motorista && !isFrota(motorista.vinculo) && valorCargaNum <= 0) {
        setError("Para motorista terceiro, informe o valor da carga.");
        return;
      }
    }

    salvandoRef.current = true;
    setSaving(true);

    try {
      const cteInformado = numeroCte.trim();
      if (cteInformado) {
        const duplicada = await buscarViagemComMesmoCte(
          cteInformado,
          isEdit ? viagem?.id : undefined
        );
        if (duplicada) {
          await mebAlert(
            `O CT-e ${cteInformado} já está vinculado a outra viagem (${duplicada.motorista_nome}, saída ${formatarDataHoraBr(duplicada.saida_em)}). Informe um número diferente.`
          );
          return;
        }
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const veiculoPrincipalId = veiculoIds[0];
      const kmInicial = roundKm(
        ultimoKmVeiculo?.km ??
          (await fetchUltimoKmVeiculo(veiculoPrincipalId))?.km ??
          null
      );

      const statusFinal: ViagemStatus = isEdit
        ? statusViagem
        : cadastroAgendado
          ? "AGENDADA"
          : "EM CARREGAMENTO";

      const payloadViagem = {
        motorista_id: motoristaId,
        veiculo_id: veiculoPrincipalId,
        data_contratacao: contratacaoEm ? new Date(contratacaoEm).toISOString() : null,
        saida_em: saidaEm ? new Date(saidaEm).toISOString() : null,
        chegada_prevista_em: chegadaEm ? new Date(chegadaEm).toISOString() : null,
        local_saida: locaisFornecedor.length
          ? formatarLocaisParceiros(
              locaisFornecedor.map((texto, i) => ({ ordem: i + 1, texto }))
            )
          : null,
        tipo_trajeto: tipoTrajeto,
        peso_kg: parseBrNumber(pesoKg),
        valor_mercadoria: parseBrNumber(valorMercadoria),
        valor_frete: parseBrNumber(valorFrete),
        data_pagamento_terceiro:
          motorista && !isFrota(motorista.vinculo)
            ? dataPagamentoTerceiro.trim() || null
            : null,
        data_pagamento:
          motorista && !isFrota(motorista.vinculo)
            ? dataPagamentoTerceiro.trim() || null
            : null,
        numero_cte: numeroCte.trim() || null,
        descricao_mercadoria: descMercadoria || null,
        km_odometro_inicial: kmInicial,
        motorista_apto: true,
        veiculo_apto: true,
        status: statusFinal,
      };

      let viagemId = viagem?.id;

      if (isEdit && viagemId) {
        const updatePayload = { ...payloadViagem };
        const veiculoMudou = viagem?.veiculo_ids[0] !== veiculoPrincipalId;
        const preservarKmAnterior =
          !emModoAgendada &&
          !veiculoMudou &&
          viagem?.km_odometro_inicial != null &&
          Number(viagem.km_odometro_inicial) > 0;
        if (preservarKmAnterior) {
          updatePayload.km_odometro_inicial = Number(viagem.km_odometro_inicial);
        }

        const { error: upErr } = await supabase
          .from("viagens")
          .update(updatePayload)
          .eq("id", viagemId);

        if (upErr) {
          setError(upErr.message);
          return;
        }
      } else {
        const { data: nova, error: viagemErr } = await supabase
          .from("viagens")
          .insert({
            ...payloadViagem,
            created_by: user?.id,
          })
          .select("id")
          .single();

        if (viagemErr || !nova) {
          setError(viagemErr?.message ?? "Erro ao salvar viagem");
          return;
        }
        viagemId = nova.id;
      }

      if (!viagemId) {
        setError("Erro ao identificar viagem");
        return;
      }

      await supabase.from("viagem_fornecedores").delete().eq("viagem_id", viagemId);
      if (locaisFornecedor.length) {
        await supabase.from("viagem_fornecedores").insert(
          locaisFornecedor.map((local, i) => ({
            viagem_id: viagemId,
            ordem: i + 1,
            local_fornecedor: local,
          }))
        );
      }

      await supabase.from("viagem_entregas").delete().eq("viagem_id", viagemId);
      if (locaisEntrega.length) {
        await supabase.from("viagem_entregas").insert(
          locaisEntrega.map((local, i) => ({
            viagem_id: viagemId,
            ordem: i + 1,
            local_entrega: local,
          }))
        );
      }

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

      if (isEdit && statusGeraFechamento(statusFinal)) {
        await syncFechamentoViagem(viagemId);
      }

      onSaved();
    } finally {
      salvandoRef.current = false;
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className={mebFormSection}>
        <h2 className="text-lg font-semibold text-slate-800">1. Motorista e veículos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <MotoristaAutocomplete
            label="Motorista"
            motoristas={motoristas}
            motoristaId={motoristaId}
            onMotoristaIdChange={setMotoristaId}
            required
          />
        </div>

        {veiculos.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum veículo cadastrado.</p>
        ) : (
          <VeiculosViagemPicker
            veiculos={veiculos}
            veiculoIds={veiculoIds}
            onVeiculoIdsChange={setVeiculoIds}
          />
        )}

        {motorista && valMotorista && (
          <div
            className={cn(
              mebFormSubsection,
              valMotorista.apto ? "border-emerald-200 bg-emerald-50/60" : "border-red-200 bg-red-50/60"
            )}
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
            <dl className="grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
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
              <div className="mt-3 flex items-start gap-2 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  {valMotorista.problemas.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                  <Link href="/cadastro/motoristas" className="mt-1 inline-block text-emerald-700 underline">
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
            className={cn(
              mebFormSubsection,
              validacao.apto ? "border-emerald-200 bg-emerald-50/60" : "border-red-200 bg-red-50/60"
            )}
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
            <dl className="grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
              <div>Chassi: {veiculo.chassi ?? "—"}</div>
              <div>Ano/Modelo: {veiculo.ano_modelo ?? "—"}</div>
              <div>RENAVAM: {veiculo.renavam ?? "—"}</div>
              {isFrota(veiculo.vinculo) && (
                <>
                  <div>Venc. CRLV: {veiculo.crlv_vencimento ?? "—"}</div>
                  <div>Venc. IPVA: {veiculo.ipva_vencimento ?? "—"}</div>
                  <div>Venc. tacógrafo: {veiculo.tacografo_vencimento ?? "—"}</div>
                </>
              )}
              <div>
                Status: {veiculo.financiado ? "Financiado" : veiculo.quitado ? "Quitado" : "—"}
              </div>
            </dl>
            {!validacao.apto && isFrota(veiculo.vinculo) && (
              <div className="mt-3 flex items-start gap-2 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  {validacao.problemas.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                  <Link href="/cadastro/veiculos" className="mt-1 inline-block text-emerald-700 underline">
                    Corrigir no cadastro de veículos
                  </Link>
                </div>
              </div>
            )}
          </div>
        ))}

        {anexosAuto.length > 0 && (
          <div className={cn(mebFormSubsection, "p-3")}>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Anexos vinculados automaticamente
            </p>
            <ul className="space-y-1 text-sm text-slate-600">
              {anexosAuto.map((a) => (
                <li
                  key={`${a.origem}-${a.categoria}-${a.file_name}`}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4 text-slate-400" />
                  {a.categoria}: {a.file_name} ({a.origem})
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className={cn(mebFormSection, emModoAgendada && "border-indigo-200/80 bg-indigo-50/30")}>
        <h2 className="text-lg font-semibold text-slate-800">
          {emModoAgendada ? "Agendamento" : "Opções"}
        </h2>
        {!isEdit ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-indigo-200 bg-white/80 px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={cadastroAgendado}
              onChange={(e) => {
                const checked = e.target.checked;
                setCadastroAgendado(checked);
                setStatusViagem(checked ? "AGENDADA" : "EM CARREGAMENTO");
              }}
              className="mt-0.5 rounded border-slate-300"
            />
            <span>
              <span className="font-medium text-slate-900">Viagem agendada (sem programação)</span>
              <span className="mt-0.5 block text-xs text-slate-600">
                Use quando motorista e veículo já estão definidos, mas ainda não há fornecedor,
                entrega, CT-e ou demais dados. Salve agora e complete depois, ao receber a nota
                fiscal de carregamento.
              </span>
            </span>
          </label>
        ) : (
          <Select
            label="Status da viagem"
            value={statusViagem}
            onChange={(e) => {
              const next = e.target.value as ViagemStatus;
              setStatusViagem(next);
              setCadastroAgendado(next === "AGENDADA");
            }}
            options={VIAGEM_STATUS.map((s) => ({
              value: s,
              label: VIAGEM_STATUS_LABEL[s] ?? s,
            }))}
          />
        )}
        {emModoAgendada && (
          <p className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
            Enquanto o status for <strong>Agendada</strong>, motorista, veículo e{" "}
            <strong>data de contratação</strong> são obrigatórios. Preencha o restante quando
            tiver a programação e altere o status.
          </p>
        )}
      </section>

      {!aptoGeral && (motoristaId || veiculoIds.length > 0) && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Resolva as pendências acima para liberar o cadastro da viagem.
        </p>
      )}

      <fieldset
        disabled={!aptoGeral}
        className="space-y-8 disabled:opacity-50"
      >
        <section className={mebFormSection}>
          <h2 className="text-lg font-semibold text-slate-800">
            2. Dados da viagem
            {emModoAgendada && (
              <span className="ml-2 text-sm font-normal text-indigo-700">
                (demais campos opcionais)
              </span>
            )}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              label="Data e hora da contratação"
              type="datetime-local"
              value={contratacaoEm}
              onChange={(e) => setContratacaoEm(e.target.value)}
              required
            />
            <Input
              label="Data e hora de saída"
              type="datetime-local"
              value={saidaEm}
              onChange={(e) => setSaidaEm(e.target.value)}
              required={exigeProgramacao}
            />
            <Input
              label="Data e hora de chegada"
              type="datetime-local"
              value={chegadaEm}
              onChange={(e) => setChegadaEm(e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-500">
            A data de contratação é obrigatória em todas as viagens, inclusive agendadas. A
            duração nos relatórios é calculada da contratação até a chegada. A chegada também
            pode ser ajustada no acompanhamento da viagem.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
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
              <span className="text-sm font-medium text-slate-700">
                Fornecedores (origem / carregamento)
              </span>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setFornecedores([...fornecedores, ""])}
              >
                <Plus className="h-4 w-4" />
                Adicionar fornecedor
              </Button>
            </div>
            {fornecedores.map((loc, i) => (
              <div key={`forn-${i}`} className="flex gap-2">
                <EntregaAutocomplete
                  label={`Fornecedor ${i + 1}`}
                  value={loc}
                  onChange={(val) => {
                    const next = [...fornecedores];
                    next[i] = val;
                    setFornecedores(next);
                  }}
                  className="flex-1"
                  tipoParceiro="fornecedor"
                  placeholder="Digite o nome do fornecedor"
                  required={exigeProgramacao && i === 0}
                />
                {fornecedores.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setFornecedores(fornecedores.filter((_, j) => j !== i))}
                    className="mt-6"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Locais de entrega</span>
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
              label={
                motorista && !isFrota(motorista.vinculo)
                  ? "Valor da carga (R$)"
                  : "Valor da mercadoria (R$)"
              }
              decimalPlaces={2}
              value={valorMercadoria}
              onChange={setValorMercadoria}
              required={exigeProgramacao && !!motorista && !isFrota(motorista.vinculo)}
            />
            <BrNumberInput
              label="Valor do frete (R$)"
              decimalPlaces={2}
              value={valorFrete}
              onChange={setValorFrete}
              placeholder="Valor a ser pago pelo frete"
            />
            {motorista && !isFrota(motorista.vinculo) && (
              <Input
                label="Data de pagamento"
                type="date"
                value={dataPagamentoTerceiro}
                onChange={(e) => setDataPagamentoTerceiro(e.target.value)}
              />
            )}
          </div>
          {veiculoIds.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
            <div
              className={cn(
                "rounded-lg border px-4 py-3 text-sm",
                ultimoKmVeiculo
                  ? "border-sky-200 bg-sky-50 text-sky-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              )}
            >
              {ultimoKmVeiculo ? (
                <>
                  <span className="font-medium">KM inicial da viagem (último abastecimento):</span>{" "}
                  {formatKmBr(ultimoKmVeiculo.km)}
                  <span className="mt-1 block text-xs opacity-80">
                    Registrado em{" "}
                    {new Date(ultimoKmVeiculo.dataHora).toLocaleString("pt-BR")}
                    {ultimoKmVeiculo.origem === "frota" ? " (Frota)" : " (viagem anterior)"}
                    {emModoAgendada && " · Será salvo automaticamente ao cadastrar"}
                  </span>
                </>
              ) : (
                <>
                  Nenhum KM de abastecimento anterior para este veículo. Informe o KM no
                  primeiro abastecimento desta viagem.
                </>
              )}
            </div>
            <div
              className={cn(
                "rounded-lg border px-4 py-3 text-sm",
                tanqueVeiculo
                  ? "border-sky-200 bg-sky-50 text-sky-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              )}
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
                    {saidaEm ? " (antes da saída da viagem)" : ""}. No consumo médio entram apenas
                    Diesel Aditivado, BS10, BS10 COMUM, S10 e S10 Aditivado abastecidos na viagem
                    (Arla, Diesel Comum e S500 não entram no KM/L).
                  </span>
                </>
              ) : (
                <>
                  Nenhum abastecimento em Frota com <strong>litros totais</strong> para o veículo
                  principal. Cadastre em Frota → Abastecimentos antes de iniciar a viagem.
                </>
              )}
            </div>
            </div>
          )}
          <Textarea
            label="Descrição da mercadoria"
            value={descMercadoria}
            onChange={(e) => setDescMercadoria(e.target.value)}
          />
        </section>

        <section className={mebFormSection}>
          <h2 className="text-lg font-semibold text-slate-800">3. Anexos da viagem</h2>
          <p className="text-sm text-slate-500">
            CNH, Toxicológico e CRLV são vinculados automaticamente do cadastro.
            Todos os demais campos aceitam vários arquivos (PDF ou imagem).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {ANEXOS_VIAGEM_CATEGORIAS_MULTIPLAS.map((categoria) => (
              <FileUploadMultiple
                key={categoria}
                label={labelAnexoMultiplo(categoria)}
                files={uploadsMultiplos[categoria] ?? []}
                onChange={(files) =>
                  setUploadsMultiplos((prev) => ({ ...prev, [categoria]: files }))
                }
                hint="PDF ou imagem — adicione quantos arquivos precisar"
              />
            ))}
          </div>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap gap-3">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
          )}
          <Button type="submit" variant="success" disabled={saving || !aptoGeral}>
            {saving
              ? "Salvando..."
              : isEdit
                ? emModoAgendada
                  ? "Salvar agendamento"
                  : "Salvar alterações"
                : emModoAgendada
                  ? "Cadastrar agendamento"
                  : "Cadastrar viagem"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
