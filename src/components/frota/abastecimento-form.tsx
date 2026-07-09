"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { BrNumberInput, BrKmInput } from "@/components/ui/br-number-input";
import { parseBrNumber, parseBrKm, kmToBrInput, rawNumberStringToBrInput } from "@/lib/number-format";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { VeiculoAutocomplete } from "@/components/ui/veiculo-autocomplete";
import { AnexosFrotaCampos } from "@/components/frota/anexos-campos";
import { salvarAnexosFrota } from "@/lib/frota-anexos";
import { carregarAbastecimentoEdicao } from "@/lib/frota-crud";
import { syncFechamentoViagem } from "@/lib/fechamento-viagem";
import { syncKmInicialViagensAgendadas, syncQuilometragemViagem } from "@/lib/veiculo-km";
import { mebAlert } from "@/lib/meb-dialog";
import { COMBUSTIVEL_TIPOS } from "@/lib/viagem-validation";
import type { AbastecimentoCard } from "@/types/frota";
import { mebFormSection } from "@/lib/utils";

export function AbastecimentoForm({
  item,
  onSaved,
  onCancel,
}: {
  item?: AbastecimentoCard;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const editando = !!item;
  const [veiculoId, setVeiculoId] = useState("");
  const [postoId, setPostoId] = useState("");
  const [km, setKm] = useState("");
  const [litros, setLitros] = useState("");
  const [litrosTotais, setLitrosTotais] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataHora, setDataHora] = useState("");
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
  const [viagemId, setViagemId] = useState<string>();
  const [teveDescontoCombustivel, setTeveDescontoCombustivel] = useState(false);
  const [valorDescontoCombustivel, setValorDescontoCombustivel] = useState("");
  const [combustivelTipo, setCombustivelTipo] = useState("");
  const [source, setSource] = useState<"manual" | "viagem">("manual");
  const [veiculos, setVeiculos] = useState<{ id: string; nome: string; placa: string }[]>([]);
  const [postos, setPostos] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(!!item);
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

  useEffect(() => {
    if (!item) return;
    carregarAbastecimentoEdicao(item).then((d) => {
      if (!d) return;
      setSource(d.source);
      setFrotaId(d.frotaId);
      setViagemRecursoId(d.viagemRecursoId);
      setViagemId(d.viagemId);
      setTeveDescontoCombustivel(!!d.teveDescontoCombustivel);
      setValorDescontoCombustivel(
        d.valorDescontoCombustivel
          ? rawNumberStringToBrInput(d.valorDescontoCombustivel, 2)
          : ""
      );
      setVeiculoId(d.veiculoId);
      setPostoId(d.postoId);
      setKm(kmToBrInput(d.km));
      setLitros(rawNumberStringToBrInput(d.litros, 2));
      setLitrosTotais(rawNumberStringToBrInput(d.litrosTotais, 2));
      setValor(rawNumberStringToBrInput(d.valor, 2));
      setDescricao(d.descricao);
      setDataHora(d.dataHora);
      setCombustivelTipo(d.combustivelTipo ?? "");
      setAnexosExistentes({
        nota_fiscal_path: d.nota_fiscal_path,
        comprovante_path: d.comprovante_path,
        nota_fiscal_nome: d.nota_fiscal_nome,
        comprovante_nome: d.comprovante_nome,
      });
      setLoading(false);
    });
  }, [item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const supabase = createClient();

    const anexosNovos =
      notaFiscal || comprovante
        ? await salvarAnexosFrota(
            frotaId
              ? `frota/abastecimentos/${frotaId}`
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

    if (editando && source === "manual" && frotaId) {
      const { error: err } = await supabase
        .from("frota_abastecimentos")
        .update({
          veiculo_id: veiculoId || null,
          posto_id: postoId || null,
          km_abastecimento: parseBrKm(km),
          litros: parseBrNumber(litros),
          litros_totais: parseBrNumber(litrosTotais),
          valor: parseBrNumber(valor) ?? 0,
          descricao: descricao || null,
          combustivel_tipo: combustivelTipo.trim() || null,
          data_hora: new Date(dataHora).toISOString(),
          ...anexosPayload,
        })
        .eq("id", frotaId);
      setSaving(false);
      if (err) {
        setError(err.message);
        return;
      }
      if (veiculoId) {
        const kmErr = await syncKmInicialViagensAgendadas(veiculoId);
        if (kmErr) {
          setError(kmErr);
          return;
        }
      }
      onSaved();
      return;
    }

    if (editando && source === "viagem" && viagemRecursoId) {
      const valorNum = parseBrNumber(valor) ?? 0;
      if (teveDescontoCombustivel) {
        const descontoNum = parseBrNumber(valorDescontoCombustivel) ?? 0;
        if (descontoNum <= 0) {
          setSaving(false);
          await mebAlert("Informe o valor do desconto obtido no abastecimento.");
          return;
        }
        if (descontoNum > valorNum) {
          setSaving(false);
          await mebAlert("O valor do desconto não pode ser maior que o valor pago.");
          return;
        }
      }
      const { error: err } = await supabase
        .from("viagem_recursos")
        .update({
          posto_id: postoId || null,
          km_abastecimento: parseBrKm(km),
          litros: parseBrNumber(litros),
          valor: valorNum,
          combustivel_tipo: combustivelTipo.trim() || null,
          teve_desconto_combustivel: teveDescontoCombustivel,
          valor_desconto_combustivel: teveDescontoCombustivel
            ? parseBrNumber(valorDescontoCombustivel)
            : null,
          descricao: descricao || null,
          realizado_em: new Date(dataHora).toISOString(),
          ...anexosPayload,
        })
        .eq("id", viagemRecursoId);
      setSaving(false);
      if (err) {
        setError(err.message);
        return;
      }
      if (viagemId) {
        await syncQuilometragemViagem(viagemId);
        await syncFechamentoViagem(viagemId);
      }
      onSaved();
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: row, error: err } = await supabase
      .from("frota_abastecimentos")
      .insert({
        veiculo_id: veiculoId || null,
        posto_id: postoId || null,
        km_abastecimento: parseBrKm(km),
        litros: parseBrNumber(litros),
        litros_totais: parseBrNumber(litrosTotais),
        valor: parseBrNumber(valor) ?? 0,
        descricao: descricao || null,
        combustivel_tipo: combustivelTipo.trim() || null,
        data_hora: new Date(dataHora).toISOString(),
        origem: "manual",
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
        `frota/abastecimentos/${row.id}`,
        notaFiscal,
        comprovante
      );
      await supabase.from("frota_abastecimentos").update(anexos).eq("id", row.id);
    }

    if (veiculoId) {
      const kmErr = await syncKmInicialViagensAgendadas(veiculoId);
      if (kmErr) {
        setSaving(false);
        setError(kmErr);
        return;
      }
    }

    setSaving(false);
    onSaved();
  }

  if (loading) {
    return <p className="text-slate-400">Carregando...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className={mebFormSection}>
      <h3 className="font-semibold text-slate-800">
        {editando ? "Editar abastecimento" : "Novo abastecimento manual"}
      </h3>
      {editando && source === "viagem" && (
        <p className="text-xs text-slate-500">
          Registro originado de viagem — veículo vinculado à viagem original.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <VeiculoAutocomplete
          label="Veículo"
          veiculos={veiculos}
          veiculoId={veiculoId}
          onVeiculoIdChange={setVeiculoId}
          required
          disabled={editando && source === "viagem"}
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
        <Select
          label="Combustível"
          value={combustivelTipo}
          onChange={(e) => setCombustivelTipo(e.target.value)}
          options={[
            { value: "", label: "Selecione..." },
            ...COMBUSTIVEL_TIPOS.map((t) => ({ value: t, label: t })),
          ]}
        />
        <BrKmInput
          label="Quilometragem do veículo (opcional)"
          value={km}
          onChange={setKm}
        />
        <BrNumberInput
          label="Litros abastecidos (opcional)"
          decimalPlaces={2}
          value={litros}
          onChange={setLitros}
          placeholder="Litros colocados no tanque"
        />
        <BrNumberInput
          label="Litros totais no tanque"
          decimalPlaces={2}
          value={litrosTotais}
          onChange={setLitrosTotais}
          placeholder="Ex: 400,00 — usado no cadastro da viagem"
        />
        <BrNumberInput
          label={
            editando && source === "viagem" ? "Valor bruto pago (R$)" : "Valor (R$)"
          }
          decimalPlaces={2}
          value={valor}
          onChange={setValor}
          required
        />
        {editando && source === "viagem" && (
          <>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={teveDescontoCombustivel}
                onChange={(e) => {
                  setTeveDescontoCombustivel(e.target.checked);
                  if (!e.target.checked) setValorDescontoCombustivel("");
                }}
                className="mt-0.5 rounded border-slate-300"
              />
              <span>
                <span className="font-medium text-slate-800">
                  Teve desconto no abastecimento
                </span>
                <span className="mt-0.5 block text-xs text-slate-600">
                  O total exibido e os relatórios usam o valor líquido (bruto − desconto).
                </span>
              </span>
            </label>
            {teveDescontoCombustivel && (
              <BrNumberInput
                label="Valor do desconto (R$)"
                decimalPlaces={2}
                value={valorDescontoCombustivel}
                onChange={setValorDescontoCombustivel}
                placeholder="Ex: 50,00"
                required
              />
            )}
          </>
        )}
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

      <AnexosFrotaCampos
        notaFiscal={notaFiscal}
        comprovante={comprovante}
        onNotaFiscalChange={setNotaFiscal}
        onComprovanteChange={setComprovante}
        existentes={anexosExistentes}
        registro={
          viagemRecursoId
            ? { tabela: "viagem_recursos", id: viagemRecursoId }
            : frotaId
              ? { tabela: "frota_abastecimentos", id: frotaId }
              : undefined
        }
        onAnexoExcluido={setAnexosExistentes}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" variant="success" disabled={saving}>
          {saving ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
