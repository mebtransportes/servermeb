"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { BrNumberInput } from "@/components/ui/br-number-input";
import { parseBrNumber, rawNumberStringToBrInput } from "@/lib/number-format";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { uploadPdf } from "@/lib/storage";
import { excluirAnexoTabela } from "@/lib/anexos-crud";
import { AnexoArquivoRow } from "@/components/shared/anexo-arquivo-row";
import type { RecursoVinculo, Veiculo, VeiculoCampoCustom, VeiculoTipo } from "@/types";
import { isFrota, VEICULO_TIPO_OPCOES, VINCULO_OPCOES } from "@/lib/viagem-validation";
import { Plus, Trash2 } from "lucide-react";
import { FileUploadField } from "@/components/ui/file-upload";

type Anexo = { id?: string; nome: string; storage_path: string; file_name: string };

export function VeiculosForm({
  veiculo,
  onSaved,
  onCancel,
}: {
  veiculo?: Veiculo & { campos?: VeiculoCampoCustom[]; anexos?: Anexo[] };
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState(veiculo?.nome ?? "");
  const [vinculo, setVinculo] = useState<RecursoVinculo>(veiculo?.vinculo ?? "frota");
  const [tipo, setTipo] = useState<VeiculoTipo>(veiculo?.tipo ?? "caminhao");
  const ehFrota = isFrota(vinculo);
  const [placa, setPlaca] = useState(veiculo?.placa ?? "");
  const [chassi, setChassi] = useState(veiculo?.chassi ?? "");
  const [anoModelo, setAnoModelo] = useState(veiculo?.ano_modelo ?? "");
  const [renavam, setRenavam] = useState(veiculo?.renavam ?? "");
  const [crlvVenc, setCrlvVenc] = useState(veiculo?.crlv_vencimento ?? "");
  const [ipvaVenc, setIpvaVenc] = useState(veiculo?.ipva_vencimento ?? "");
  const [quitado, setQuitado] = useState(veiculo?.quitado ?? true);
  const [financiado, setFinanciado] = useState(veiculo?.financiado ?? false);
  const [parcelas, setParcelas] = useState(
    rawNumberStringToBrInput(veiculo?.parcelas_restantes, 0)
  );
  const [diaParcela, setDiaParcela] = useState(
    rawNumberStringToBrInput(veiculo?.dia_vencimento_parcela, 0)
  );
  const [camposCustom, setCamposCustom] = useState<VeiculoCampoCustom[]>(
    veiculo?.campos ?? []
  );
  const [anexos, setAnexos] = useState<Anexo[]>(veiculo?.anexos ?? []);
  const [pdfNome, setPdfNome] = useState("CRLV");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (quitado) setFinanciado(false);
  }, [quitado]);

  function addCampoCustom() {
    setCamposCustom([...camposCustom, { nome_opcao: "", valor: "" }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      nome,
      vinculo,
      tipo,
      placa: placa.toUpperCase(),
      chassi: ehFrota ? chassi || null : null,
      ano_modelo: ehFrota ? anoModelo || null : null,
      renavam: ehFrota ? renavam || null : null,
      crlv_vencimento: ehFrota ? crlvVenc || null : null,
      ipva_vencimento: ehFrota ? ipvaVenc || null : null,
      quitado: ehFrota ? quitado : true,
      financiado: ehFrota ? financiado && !quitado : false,
      parcelas_restantes:
        ehFrota && financiado && parcelas ? parseBrNumber(parcelas) : null,
      dia_vencimento_parcela:
        ehFrota && financiado && diaParcela ? parseBrNumber(diaParcela) : null,
      created_by: user?.id,
    };

    let veiculoId = veiculo?.id;

    if (veiculoId) {
      const { error: updErr } = await supabase
        .from("veiculos")
        .update(payload)
        .eq("id", veiculoId);
      if (updErr) {
        setError(updErr.message);
        setSaving(false);
        return;
      }
      await supabase.from("veiculo_campos_custom").delete().eq("veiculo_id", veiculoId);
    } else {
      const { data, error: insErr } = await supabase
        .from("veiculos")
        .insert(payload)
        .select("id")
        .single();
      if (insErr || !data) {
        setError(insErr?.message ?? "Erro ao salvar");
        setSaving(false);
        return;
      }
      veiculoId = data.id;
    }

    if (ehFrota) {
      const camposValidos = camposCustom.filter(
        (c) => c.nome_opcao.trim() && c.valor.trim()
      );
      if (camposValidos.length) {
        await supabase.from("veiculo_campos_custom").insert(
          camposValidos.map((c) => ({
            veiculo_id: veiculoId,
            nome_opcao: c.nome_opcao.trim(),
            valor: c.valor.trim(),
          }))
        );
      }
    }

    if (ehFrota && pdfFile && veiculoId) {
      const uploaded = await uploadPdf(pdfFile, `veiculos/${veiculoId}`);
      if (uploaded) {
        await supabase.from("veiculo_anexos").insert({
          veiculo_id: veiculoId,
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
        label="Vínculo do veículo"
        value={vinculo}
        onChange={(e) => setVinculo(e.target.value as RecursoVinculo)}
        options={VINCULO_OPCOES.map((o) => ({ value: o.value, label: o.label }))}
      />

      {!ehFrota && (
        <p className="rounded-lg border border-amber-800/40 bg-amber-950/25 px-4 py-3 text-sm text-amber-200">
          Veículo de terceiro: cadastre apenas identificação para viagens e fechamento.
          CRLV, IPVA e demais documentos da frota não são exigidos.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="Nome do veículo" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <Select
          label="Tipo do veículo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as VeiculoTipo)}
          options={VEICULO_TIPO_OPCOES.map((o) => ({ value: o.value, label: o.label }))}
        />
        <Input label="Placa" value={placa} onChange={(e) => setPlaca(e.target.value)} required />
        {ehFrota && (
          <>
            <Input label="Chassi" value={chassi} onChange={(e) => setChassi(e.target.value)} />
            <Input label="Ano / Modelo" value={anoModelo} onChange={(e) => setAnoModelo(e.target.value)} />
            <Input label="RENAVAM" value={renavam} onChange={(e) => setRenavam(e.target.value)} />
            <Input label="Vencimento CRLV" type="date" value={crlvVenc} onChange={(e) => setCrlvVenc(e.target.value)} />
            <Input label="Vencimento IPVA" type="date" value={ipvaVenc} onChange={(e) => setIpvaVenc(e.target.value)} />
          </>
        )}
      </div>

      {ehFrota && (
        <>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={quitado}
                onChange={(e) => setQuitado(e.target.checked)}
                className="rounded border-slate-600"
              />
              Veículo quitado
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={financiado}
                disabled={quitado}
                onChange={(e) => setFinanciado(e.target.checked)}
                className="rounded border-slate-600"
              />
              Financiado
            </label>
          </div>

          {financiado && !quitado && (
            <div className="grid gap-4 sm:grid-cols-2">
              <BrNumberInput
                label="Parcelas restantes"
                decimalPlaces={0}
                value={parcelas}
                onChange={setParcelas}
              />
              <BrNumberInput
                label="Dia de vencimento da parcela"
                decimalPlaces={0}
                value={diaParcela}
                onChange={setDiaParcela}
              />
            </div>
          )}

          <div className="space-y-3 rounded-xl border border-slate-700/60 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-cyan-400">Campos personalizados</h3>
              <Button type="button" variant="secondary" onClick={addCampoCustom}>
                <Plus className="h-4 w-4" />
                Cadastre outra opção
              </Button>
            </div>
            {camposCustom.map((campo, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2">
                <Input
                  label="Nome da opção"
                  value={campo.nome_opcao}
                  onChange={(e) => {
                    const next = [...camposCustom];
                    next[i] = { ...campo, nome_opcao: e.target.value };
                    setCamposCustom(next);
                  }}
                  className="flex-1 min-w-[180px]"
                />
                <Input
                  label="Dado"
                  value={campo.valor}
                  onChange={(e) => {
                    const next = [...camposCustom];
                    next[i] = { ...campo, valor: e.target.value };
                    setCamposCustom(next);
                  }}
                  className="flex-1 min-w-[120px]"
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCamposCustom(camposCustom.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-700/60 p-4">
            <h3 className="text-sm font-semibold text-cyan-400">Anexos PDF</h3>
            {anexos.map((a) => (
              <AnexoRow
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
        </>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : veiculo ? "Atualizar" : "Cadastrar veículo"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function AnexoRow({
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
    const err = await excluirAnexoTabela("veiculo_anexos", anexo.id, anexo.storage_path);
    setExcluindo(false);
    if (err) {
      alert(err);
      return;
    }
    onExcluido();
  }

  return (
    <AnexoArquivoRow
      label={`${anexo.nome} — ${anexo.file_name}`}
      storagePath={anexo.storage_path}
      onExcluir={handleExcluir}
      excluindo={excluindo}
    />
  );
}
