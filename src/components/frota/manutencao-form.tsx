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
import {
  montarPayloadPagamento,
  salvarParcelasManutencao,
} from "@/lib/frota-manutencao-pagamento";
import {
  criarParcelasVazias,
  PAGAMENTO_FORMA_OPCOES,
  PAGAMENTO_MODALIDADE_OPCOES,
  validarPagamentoManutencao,
  type ManutencaoPagamentoForma,
  type ManutencaoPagamentoModalidade,
  type ManutencaoParcelaInput,
} from "@/lib/manutencao-pagamento";
import type { FrotaManutencaoStatus, ManutencaoCard } from "@/types/frota";

export type ManutencaoFormPrefill = {
  nome?: string;
  veiculoId?: string;
  data?: string;
};

export function ManutencaoForm({
  item,
  statusInicial = "AGENDADO",
  prefill,
  onSaved,
  onCancel,
}: {
  item?: ManutencaoCard;
  statusInicial?: FrotaManutencaoStatus;
  prefill?: ManutencaoFormPrefill;
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
  const [pagamentoModalidade, setPagamentoModalidade] = useState<
    ManutencaoPagamentoModalidade | ""
  >("");
  const [pagamentoForma, setPagamentoForma] = useState<ManutencaoPagamentoForma | "">("");
  const [pagamentoVencimento, setPagamentoVencimento] = useState("");
  const [qtdParcelas, setQtdParcelas] = useState("1");
  const [parcelas, setParcelas] = useState<ManutencaoParcelaInput[]>([]);
  const [dataProximaManutencao, setDataProximaManutencao] = useState("");
  const [loading, setLoading] = useState(!!item);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const mostrarPagamento = source === "preventiva";

  useEffect(() => {
    if (item || !prefill) return;
    if (prefill.nome) setNome(prefill.nome);
    if (prefill.veiculoId) setVeiculoId(prefill.veiculoId);
    if (prefill.data) setData(prefill.data);
    setStatus("AGENDADO");
  }, [item, prefill]);

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
      if (d.source === "preventiva") {
        setPagamentoModalidade(d.pagamentoModalidade);
        setPagamentoForma(d.pagamentoForma);
        setPagamentoVencimento(d.pagamentoVencimento);
        setParcelas(d.parcelas);
        setQtdParcelas(String(d.parcelas.length || 1));
        setDataProximaManutencao(d.dataProximaManutencao);
      }
      setLoading(false);
    });
  }, [item]);

  function atualizarQtdParcelas(novaQtd: string) {
    const n = Math.max(1, Math.min(48, parseInt(novaQtd, 10) || 1));
    setQtdParcelas(String(n));
    const total = parseBrNumber(valor) ?? 0;
    setParcelas((atual) => {
      const datas = atual.map((p) => p.dataVencimento);
      const novas = criarParcelasVazias(n, total);
      return novas.map((p, i) => ({
        ...p,
        dataVencimento: datas[i] ?? p.dataVencimento,
      }));
    });
  }

  function redistribuirParcelas() {
    const total = parseBrNumber(valor) ?? 0;
    setParcelas((atual) => {
      const datas = atual.map((p) => p.dataVencimento);
      const novas = criarParcelasVazias(atual.length || 1, total);
      return novas.map((p, i) => ({
        ...p,
        dataVencimento: datas[i] ?? p.dataVencimento,
      }));
    });
  }

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
    const valorNumerico = parseBrNumber(valor) ?? 0;

    if (mostrarPagamento) {
      const erroPag = validarPagamentoManutencao({
        modalidade: pagamentoModalidade,
        forma: pagamentoForma,
        vencimentoAvista: pagamentoVencimento,
        parcelas,
        valorTotal: valorNumerico,
        parseValor: parseBrNumber,
      });
      if (erroPag) {
        setSaving(false);
        setError(erroPag);
        return;
      }
    }

    const payloadPagamento =
      mostrarPagamento && pagamentoModalidade && pagamentoForma
        ? montarPayloadPagamento({
            modalidade: pagamentoModalidade,
            forma: pagamentoForma,
            vencimentoAvista: pagamentoVencimento,
          })
        : {};

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
          valor_total: valorNumerico,
          status,
          data_proxima_manutencao: dataProximaManutencao || null,
          ...anexosPayload,
          ...payloadPagamento,
        })
        .eq("id", frotaId);
      if (err) {
        setSaving(false);
        setError(err.message);
        return;
      }
      try {
        await salvarParcelasManutencao(
          frotaId,
          pagamentoModalidade === "A_PRAZO" ? parcelas : []
        );
      } catch (parcelaErr) {
        setSaving(false);
        setError(parcelaErr instanceof Error ? parcelaErr.message : "Erro ao salvar parcelas");
        return;
      }
      setSaving(false);
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
        valor_total: valorNumerico,
        status,
        origem: "preventiva",
        created_by: user?.id,
        data_proxima_manutencao: dataProximaManutencao || null,
        ...payloadPagamento,
      })
      .select("id")
      .single();

    if (err || !row) {
      setSaving(false);
      setError(err?.message ?? "Erro ao salvar");
      return;
    }

    try {
      await salvarParcelasManutencao(
        row.id,
        pagamentoModalidade === "A_PRAZO" ? parcelas : []
      );
    } catch (parcelaErr) {
      setSaving(false);
      setError(parcelaErr instanceof Error ? parcelaErr.message : "Erro ao salvar parcelas");
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
        {mostrarPagamento && (
          <Input
            label="Próxima manutenção prevista (opcional)"
            type="date"
            value={dataProximaManutencao}
            onChange={(e) => setDataProximaManutencao(e.target.value)}
            min={data || undefined}
          />
        )}
      </div>
      {mostrarPagamento && (
        <p className="-mt-2 text-xs text-slate-500">
          Informe quando este serviço deve ser repetido no veículo (ex.: próxima troca de óleo).
          O sistema alerta 1 dia antes e no dia previsto.
        </p>
      )}

      {mostrarPagamento && (
        <div className="space-y-4 rounded-lg border border-slate-700/60 bg-slate-950/40 p-4">
          <h4 className="text-sm font-semibold text-cyan-400">Pagamento</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Modalidade"
              value={pagamentoModalidade}
              onChange={(e) => {
                const mod = e.target.value as ManutencaoPagamentoModalidade | "";
                setPagamentoModalidade(mod);
                if (mod === "A_PRAZO" && !parcelas.length) {
                  atualizarQtdParcelas(qtdParcelas);
                }
              }}
              options={[
                { value: "", label: "Selecione..." },
                ...PAGAMENTO_MODALIDADE_OPCOES,
              ]}
              required
            />
            <Select
              label="Forma de pagamento"
              value={pagamentoForma}
              onChange={(e) =>
                setPagamentoForma(e.target.value as ManutencaoPagamentoForma | "")
              }
              options={[
                { value: "", label: "Selecione..." },
                ...PAGAMENTO_FORMA_OPCOES,
              ]}
              required
            />
          </div>

          {pagamentoModalidade === "A_VISTA" && (
            <Input
              label="Data de pagamento"
              type="date"
              value={pagamentoVencimento}
              onChange={(e) => setPagamentoVencimento(e.target.value)}
              required
            />
          )}

          {pagamentoModalidade === "A_PRAZO" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-32">
                  <Input
                    label="Nº de parcelas"
                    type="number"
                    min={1}
                    max={48}
                    value={qtdParcelas}
                    onChange={(e) => atualizarQtdParcelas(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="px-3 py-2 text-sm"
                  onClick={redistribuirParcelas}
                >
                  Redistribuir valores
                </Button>
              </div>
              <div className="space-y-2">
                {parcelas.map((p, idx) => (
                  <div
                    key={p.numero}
                    className="grid gap-2 rounded-md border border-slate-700/50 bg-slate-900/60 p-3 sm:grid-cols-[auto_1fr_1fr]"
                  >
                    <span className="self-center text-xs font-semibold text-slate-400">
                      {p.numero}ª
                    </span>
                    <BrNumberInput
                      label="Valor (R$)"
                      decimalPlaces={2}
                      value={p.valor}
                      onChange={(v) =>
                        setParcelas((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, valor: v } : x))
                        )
                      }
                      required
                    />
                    <Input
                      label="Vencimento"
                      type="date"
                      value={p.dataVencimento}
                      onChange={(e) =>
                        setParcelas((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, dataVencimento: e.target.value } : x
                          )
                        )
                      }
                      required
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Cada parcela pode ter data de vencimento diferente. A soma dos valores deve
                corresponder ao valor total da manutenção.
              </p>
            </div>
          )}
        </div>
      )}

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
              ? { tabela: "frota_manutencoes", id: frotaId }
              : undefined
        }
        onAnexoExcluido={setAnexosExistentes}
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
