"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { BrNumberInput } from "@/components/ui/br-number-input";
import { parseBrNumber } from "@/lib/number-format";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { uploadFile, getFileUrl } from "@/lib/storage";
import type { ViagemRecursoTipo } from "@/types";
import { COMBUSTIVEL_TIPOS, isFrota } from "@/lib/viagem-validation";
import {
  calcularSeguroCarga,
  MONITORAMENTO_VALOR_FIXO,
} from "@/types/fechamento";
import { rawNumberStringToBrInput } from "@/lib/number-format";
import { Plus, Trash2 } from "lucide-react";
import { AnexoArquivoRow } from "@/components/shared/anexo-arquivo-row";
import { FrotaAnexosLinks } from "@/components/frota/frota-anexos-links";
import { excluirAnexoFrotaInline, excluirAnexoTabela } from "@/lib/anexos-crud";
import type { CampoAnexoFrota } from "@/lib/anexos-crud";
import { FileUploadMultiple } from "@/components/ui/file-upload";
import { AnexosFrotaCampos } from "@/components/frota/anexos-campos";
import { salvarAnexosFrota } from "@/lib/frota-anexos";
import { syncFechamentoViagem } from "@/lib/fechamento-viagem";
import { cn, mebFormSubsection } from "@/lib/utils";
import { mebAlert, mebConfirm } from "@/lib/meb-dialog";

type Recurso = {
  id: string;
  tipo: ViagemRecursoTipo;
  valor: number;
  descricao?: string | null;
  posto_id?: string | null;
  oficina_id?: string | null;
  realizado_em: string;
  km_abastecimento?: number | null;
  litros?: number | null;
  abastecimento_inicial?: boolean;
  combustivel_tipo?: string | null;
  nota_fiscal_path?: string | null;
  nota_fiscal_nome?: string | null;
  comprovante_path?: string | null;
  comprovante_nome?: string | null;
  recurso_par_id?: string | null;
  desconta_motorista?: boolean;
  teve_desconto_combustivel?: boolean;
  valor_desconto_combustivel?: number | null;
  postos?: { nome: string } | null;
  oficinas?: { nome: string } | null;
};

type Anexo = {
  id: string;
  nome: string;
  file_name: string;
  storage_path: string;
};

export function ViagemRecursos({
  viagemId,
  onRecursosChanged,
}: {
  viagemId: string;
  onRecursosChanged?: () => void;
}) {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [postos, setPostos] = useState<{ id: string; nome: string }[]>([]);
  const [oficinas, setOficinas] = useState<{ id: string; nome: string }[]>([]);
  const [showFormGasto, setShowFormGasto] = useState(false);
  const [showFormReembolso, setShowFormReembolso] = useState(false);

  const [tipo, setTipo] = useState<ViagemRecursoTipo>("abastecimento");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [postoId, setPostoId] = useState("");
  const [oficinaId, setOficinaId] = useState("");
  const [realizadoEm, setRealizadoEm] = useState("");
  const [kmVeiculo, setKmVeiculo] = useState("");
  const [litros, setLitros] = useState("");
  const [combustivelTipo, setCombustivelTipo] = useState("");
  const [notaFiscal, setNotaFiscal] = useState<File | null>(null);
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [valorCarga, setValorCarga] = useState<number | null>(null);
  const [motoristaTerceiro, setMotoristaTerceiro] = useState(false);
  const [kmOdometroInicial, setKmOdometroInicial] = useState<number | null>(null);
  const [motoristaAdiantou, setMotoristaAdiantou] = useState(false);
  const [naoDescontaMotorista, setNaoDescontaMotorista] = useState(false);
  const [teveDescontoCombustivel, setTeveDescontoCombustivel] = useState(false);
  const [valorDescontoCombustivel, setValorDescontoCombustivel] = useState("");

  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("viagem_recursos")
      .select("*, postos(nome), oficinas(nome)")
      .eq("viagem_id", viagemId)
      .order("realizado_em", { ascending: false });
    setRecursos(
      ((data as Recurso[]) ?? []).filter((r) => !r.abastecimento_inicial)
    );
  };

  useEffect(() => {
    load();
    const supabase = createClient();
    Promise.all([
      supabase.from("postos").select("id, nome").order("nome"),
      supabase.from("oficinas").select("id, nome").order("nome"),
      supabase
        .from("viagens")
        .select("valor_mercadoria, km_odometro_inicial, motoristas(vinculo)")
        .eq("id", viagemId)
        .single(),
    ]).then(([p, o, v]) => {
      setPostos(p.data ?? []);
      setOficinas(o.data ?? []);
      const viagem = v.data;
      if (viagem) {
        const carga = Number(viagem.valor_mercadoria);
        setValorCarga(Number.isFinite(carga) && carga > 0 ? carga : null);
        const kmIni = Number(viagem.km_odometro_inicial);
        setKmOdometroInicial(Number.isFinite(kmIni) && kmIni > 0 ? kmIni : null);
        const mRaw = viagem.motoristas as
          | { vinculo?: string }
          | { vinculo?: string }[]
          | null;
        const m = Array.isArray(mRaw) ? mRaw[0] : mRaw;
        setMotoristaTerceiro(m ? !isFrota(m.vinculo as "frota" | "terceiro") : false);
      }
    });
  }, [viagemId]);

  useEffect(() => {
    if (tipo !== "abastecimento" || kmVeiculo) return;
    const ultimoNaViagem = recursos
      .filter((r) => r.tipo === "abastecimento" && r.km_abastecimento != null)
      .sort(
        (a, b) =>
          new Date(b.realizado_em).getTime() - new Date(a.realizado_em).getTime()
      )[0];
    const km =
      ultimoNaViagem?.km_abastecimento ?? kmOdometroInicial;
    if (km != null) {
      setKmVeiculo(String(km));
    }
  }, [tipo, recursos, kmOdometroInicial]);

  useEffect(() => {
    if (!motoristaTerceiro) return;
    if (tipo === "seguro" && valorCarga) {
      setValor(
        rawNumberStringToBrInput(String(calcularSeguroCarga(valorCarga)), 2)
      );
    } else if (tipo === "monitoramento") {
      setValor(rawNumberStringToBrInput(String(MONITORAMENTO_VALOR_FIXO), 2));
    }
  }, [tipo, valorCarga, motoristaTerceiro]);

  const recursosGastos = recursos.filter((r) => r.tipo !== "reembolso");
  const recursosReembolso = recursos.filter((r) => r.tipo === "reembolso");

  function limparFormulario() {
    setValor("");
    setDescricao("");
    setPostoId("");
    setOficinaId("");
    setRealizadoEm("");
    setKmVeiculo("");
    setLitros("");
    setCombustivelTipo("");
    setNotaFiscal(null);
    setComprovante(null);
    setFiles([]);
    setMotoristaAdiantou(false);
    setNaoDescontaMotorista(false);
    setTeveDescontoCombustivel(false);
    setValorDescontoCombustivel("");
  }

  async function handleAdd(e: React.FormEvent, tipoFixo?: "reembolso") {
    e.preventDefault();
    const tipoLancamento = tipoFixo ?? tipo;

    if (tipoLancamento === "outro" && !descricao.trim()) {
      await mebAlert("Informe o nome da despesa (ex.: Lavagem do veículo).");
      return;
    }

    const valorNum = parseBrNumber(valor) ?? 0;
    if (valorNum <= 0) {
      await mebAlert("Informe um valor maior que zero.");
      return;
    }

    if (tipoLancamento === "abastecimento") {
      if (!parseBrNumber(kmVeiculo)) {
        await mebAlert("Informe a quilometragem atual do veículo no abastecimento.");
        return;
      }
      if (!parseBrNumber(litros)) {
        await mebAlert("Informe os litros abastecidos.");
        return;
      }
      if (!combustivelTipo) {
        await mebAlert("Selecione o tipo de combustível.");
        return;
      }
      if (teveDescontoCombustivel) {
        const descontoNum = parseBrNumber(valorDescontoCombustivel) ?? 0;
        if (descontoNum <= 0) {
          await mebAlert("Informe o valor do desconto obtido no abastecimento.");
          return;
        }
        if (descontoNum > valorNum) {
          await mebAlert("O valor do desconto não pode ser maior que o valor pago.");
          return;
        }
      }
    }

    setSaving(true);
    const supabase = createClient();

    const payload: Record<string, unknown> = {
      viagem_id: viagemId,
      tipo: tipoLancamento,
      valor: parseBrNumber(valor) ?? 0,
      descricao: descricao || null,
      posto_id: tipoLancamento === "abastecimento" && postoId ? postoId : null,
      oficina_id: tipoLancamento === "manutencao" && oficinaId ? oficinaId : null,
      realizado_em: new Date(realizadoEm).toISOString(),
    };
    if (kmVeiculo) {
      const km = parseBrNumber(kmVeiculo);
      if (tipoLancamento === "abastecimento") payload.km_abastecimento = km;
      else if (tipoLancamento === "manutencao") payload.km_veiculo = km;
    }
    if (tipoLancamento === "abastecimento") {
      if (litros) payload.litros = parseBrNumber(litros);
      if (combustivelTipo) payload.combustivel_tipo = combustivelTipo;
      payload.teve_desconto_combustivel = teveDescontoCombustivel;
      payload.valor_desconto_combustivel = teveDescontoCombustivel
        ? parseBrNumber(valorDescontoCombustivel) ?? 0
        : null;
    }
    if (tipoLancamento === "manutencao") payload.status_frota = "FINALIZADO";
    if (tipoLancamento === "pedagio" || tipoLancamento === "estacionamento" || tipoLancamento === "descarga") {
      payload.desconta_motorista = !naoDescontaMotorista;
    }
    if (tipoLancamento === "outro") {
      payload.desconta_motorista = false;
    }

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

    if (tipoLancamento === "outro" && motoristaAdiantou) {
      const valorNum = parseBrNumber(valor) ?? 0;
      const nomeDespesa = descricao.trim();
      const { error: errReembolso } = await supabase.from("viagem_recursos").insert({
        viagem_id: viagemId,
        tipo: "reembolso",
        valor: valorNum,
        descricao: `Reembolso — ${nomeDespesa}`,
        realizado_em: new Date(realizadoEm).toISOString(),
        recurso_par_id: recurso.id,
      });
      if (errReembolso) {
        await mebAlert(errReembolso.message);
        setSaving(false);
        return;
      }
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

    setShowFormGasto(false);
    setShowFormReembolso(false);
    limparFormulario();
    await syncFechamentoViagem(viagemId);
    setSaving(false);
    await load();
    onRecursosChanged?.();
  }

  async function handleExcluir(recursoId: string, recurso?: Recurso) {
    const vinculados =
      recurso?.tipo === "outro"
        ? recursos.filter((r) => r.recurso_par_id === recursoId)
        : [];
    const msg =
      vinculados.length > 0
        ? `Excluir esta despesa e o reembolso vinculado (${vinculados.length})?`
        : "Excluir este lançamento? Os anexos vinculados também serão removidos.";
    if (
      !(await mebConfirm(msg, { variant: "danger", confirmLabel: "Excluir" }))
    ) {
      return;
    }

    setExcluindoId(recursoId);
    const supabase = createClient();

    if (vinculados.length) {
      await supabase
        .from("viagem_recursos")
        .delete()
        .in(
          "id",
          vinculados.map((r) => r.id)
        );
    }

    const { error } = await supabase
      .from("viagem_recursos")
      .delete()
      .eq("id", recursoId);

    if (error) {
      await mebAlert(error.message);
      setExcluindoId(null);
      return;
    }

    await syncFechamentoViagem(viagemId);
    setExcluindoId(null);
    await load();
    onRecursosChanged?.();
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Gastos da viagem</h3>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setShowFormReembolso(false);
              setShowFormGasto(!showFormGasto);
            }}
          >
            <Plus className="h-4 w-4" />
            Adicionar gasto
          </Button>
        </div>

      {showFormGasto && (
        <form
          onSubmit={(e) => handleAdd(e)}
          className={cn(mebFormSubsection, "space-y-3")}
        >
          <Select
            label="Tipo de gasto"
            tone="light"
            value={tipo}
            onChange={(e) => {
              const t = e.target.value as ViagemRecursoTipo;
              setTipo(t);
              if (t !== "abastecimento") {
                setLitros("");
                setCombustivelTipo("");
                setTeveDescontoCombustivel(false);
                setValorDescontoCombustivel("");
              }
              if (t !== "outro") setMotoristaAdiantou(false);
              if (t !== "pedagio" && t !== "estacionamento" && t !== "descarga") setNaoDescontaMotorista(false);
            }}
            options={[
              { value: "abastecimento", label: "Abastecimento" },
              { value: "manutencao", label: "Manutenção" },
              { value: "pedagio", label: "Pedágio" },
              { value: "estacionamento", label: "Estacionamento" },
              { value: "descarga", label: "Descarga" },
              { value: "seguro", label: "Seguro" },
              { value: "monitoramento", label: "Monitoramento" },
              { value: "adiantamento", label: "Adiantamento" },
              { value: "outro", label: "Outros (despesa personalizada)" },
            ]}
          />
          {tipo === "adiantamento" && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-3 text-xs text-orange-800">
              Adiantamento de salário ao motorista. O valor será{" "}
              <strong>descontado da comissão</strong> no fechamento da viagem.
            </div>
          )}
          {tipo === "outro" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
              Registre o custo para o financeiro. Se o motorista pagou do bolso, marque a opção
              abaixo para gerar o reembolso automaticamente com o mesmo valor.
            </div>
          )}
          {motoristaTerceiro && tipo === "seguro" && !valorCarga && (
            <p className="text-xs text-amber-700">
              Cadastre o valor da carga na viagem para calcular o seguro (0,09%).
            </p>
          )}
          {motoristaTerceiro && tipo === "seguro" && valorCarga && (
            <p className="text-xs text-slate-600">
              Seguro calculado: 0,09% sobre {valorCarga.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          )}
          {motoristaTerceiro && tipo === "monitoramento" && (
            <p className="text-xs text-slate-600">
              Valor fixo de monitoramento: R$ {MONITORAMENTO_VALOR_FIXO.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <BrNumberInput
              label="Valor (R$)"
              decimalPlaces={2}
              value={valor}
              onChange={setValor}
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
            <BrNumberInput
              label={
                tipo === "abastecimento"
                  ? "Quilometragem atual do veículo"
                  : "Quilometragem do veículo (opcional)"
              }
              decimalPlaces={0}
              value={kmVeiculo}
              onChange={setKmVeiculo}
              placeholder="Ex: 125.430"
              required={tipo === "abastecimento"}
            />
          )}
          {tipo === "abastecimento" && (
            <>
              <Select
                label="Tipo de combustível"
                tone="light"
                value={combustivelTipo}
                onChange={(e) => setCombustivelTipo(e.target.value)}
                options={[
                  { value: "", label: "Selecione o combustível" },
                  ...COMBUSTIVEL_TIPOS.map((c) => ({ value: c, label: c })),
                ]}
              />
              <Select
                label="Posto"
                tone="light"
                value={postoId}
                onChange={(e) => setPostoId(e.target.value)}
                options={[
                  { value: "", label: "Selecione ou deixe em branco" },
                  ...postos.map((p) => ({ value: p.id, label: p.nome })),
                ]}
              />
              <BrNumberInput
                label="Litros abastecidos"
                decimalPlaces={2}
                value={litros}
                onChange={setLitros}
                placeholder="Ex: 150,50"
                required
              />
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
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
                    Marque se obteve desconto no posto (controle financeiro).
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
          {tipo === "manutencao" && (
            <Select
              label="Oficina"
              tone="light"
              value={oficinaId}
              onChange={(e) => setOficinaId(e.target.value)}
              options={[
                { value: "", label: "Selecione ou deixe em branco" },
                ...oficinas.map((o) => ({ value: o.id, label: o.nome })),
              ]}
            />
          )}
          {tipo === "outro" ? (
            <>
              <Input
                label="Nome da despesa"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Lavagem do veículo, borracharia, alimentação..."
                required
              />
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={motoristaAdiantou}
                  onChange={(e) => setMotoristaAdiantou(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300"
                />
                <span>
                  <span className="font-medium text-violet-800">
                    Motorista pagou do bolso
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-600">
                    Gera automaticamente um reembolso com o mesmo valor para devolver ao motorista.
                  </span>
                </span>
              </label>
            </>
          ) : tipo === "adiantamento" ? (
            <Textarea
              label="Observação (opcional)"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: adiantamento quinzenal, vale salário..."
            />
          ) : (
            <>
              <Textarea
                label="Descrição"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder={
                  tipo === "pedagio"
                    ? "Ex: praça de pedágio, rota, etc."
                    : tipo === "estacionamento"
                      ? "Ex: local, período, etc."
                      : tipo === "descarga"
                        ? "Ex: local da descarga, ajudante, etc."
                        : tipo === "seguro"
                        ? "Ex: apólice, cobertura, etc."
                        : tipo === "monitoramento"
                          ? "Ex: rastreador, mensalidade, etc."
                          : ""
                }
              />
              {(tipo === "pedagio" || tipo === "estacionamento" || tipo === "descarga") && (
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={naoDescontaMotorista}
                    onChange={(e) => setNaoDescontaMotorista(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300"
                  />
                  <span>
                    <span className="font-medium text-slate-800">
                      Não descontar do motorista
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-600">
                      O valor entra no financeiro da empresa, mas não reduz a comissão do motorista.
                      Não gera reembolso.
                    </span>
                  </span>
                </label>
              )}
            </>
          )}
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
            <Button type="submit" variant="success" disabled={saving}>
              Salvar gasto
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowFormGasto(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {recursosGastos.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum gasto registrado.</p>
      ) : (
        <ul className="space-y-2">
          {recursosGastos.map((r) => (
            <RecursoItem
              key={r.id}
              recurso={r}
              viagemId={viagemId}
              onExcluir={() => handleExcluir(r.id, r)}
              excluindo={excluindoId === r.id}
              onAnexoAlterado={load}
              reembolsosVinculados={recursosReembolso.filter(
                (rb) => rb.recurso_par_id === r.id
              )}
            />
          ))}
        </ul>
      )}
      </section>

      <section className="space-y-4 border-t border-slate-200 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">Reembolso ao motorista</h3>
            <p className="text-xs text-slate-500">
              Valores a devolver ao motorista. Despesas &quot;Outros&quot; com adiantamento geram
              reembolso automático vinculado.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setShowFormGasto(false);
              setShowFormReembolso(!showFormReembolso);
            }}
          >
            <Plus className="h-4 w-4" />
            Adicionar reembolso
          </Button>
        </div>

        {showFormReembolso && (
          <form
            onSubmit={(e) => handleAdd(e, "reembolso")}
            className={cn(mebFormSubsection, "space-y-3")}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <BrNumberInput
                label="Valor a reembolsar (R$)"
                decimalPlaces={2}
                value={valor}
                onChange={setValor}
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
            <Textarea
              label="Descrição"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: despesa paga pelo motorista — aguardando reembolso"
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
              <Button type="submit" variant="success" disabled={saving}>
                Salvar reembolso
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowFormReembolso(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {recursosReembolso.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum reembolso registrado.</p>
        ) : (
          <ul className="space-y-2">
            {recursosReembolso.map((r) => (
              <RecursoItem
                key={r.id}
                recurso={r}
                viagemId={viagemId}
                onExcluir={() => handleExcluir(r.id, r)}
                excluindo={excluindoId === r.id}
                onAnexoAlterado={load}
                despesaVinculada={
                  r.recurso_par_id
                    ? recursosGastos.find((g) => g.id === r.recurso_par_id)
                    : undefined
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RecursoItem({
  recurso,
  viagemId,
  onExcluir,
  excluindo,
  onAnexoAlterado,
  reembolsosVinculados,
  despesaVinculada,
}: {
  recurso: Recurso;
  viagemId: string;
  onExcluir: () => void;
  excluindo: boolean;
  onAnexoAlterado: () => void;
  reembolsosVinculados?: Recurso[];
  despesaVinculada?: Recurso;
}) {
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [anexosInline, setAnexosInline] = useState({
    nota_fiscal_path: recurso.nota_fiscal_path,
    nota_fiscal_nome: recurso.nota_fiscal_nome,
    comprovante_path: recurso.comprovante_path,
    comprovante_nome: recurso.comprovante_nome,
  });
  const [excluindoCampo, setExcluindoCampo] = useState<CampoAnexoFrota | null>(null);

  useEffect(() => {
    setAnexosInline({
      nota_fiscal_path: recurso.nota_fiscal_path,
      nota_fiscal_nome: recurso.nota_fiscal_nome,
      comprovante_path: recurso.comprovante_path,
      comprovante_nome: recurso.comprovante_nome,
    });
  }, [recurso]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("viagem_anexos")
      .select("id, nome, file_name, storage_path")
      .eq("recurso_id", recurso.id)
      .then(({ data }) => setAnexos(data ?? []));
  }, [recurso.id]);

  async function excluirAnexoInline(campo: CampoAnexoFrota, path: string) {
    if (
      !(await mebConfirm("Excluir este documento?", {
        variant: "danger",
        confirmLabel: "Excluir",
      }))
    ) {
      return;
    }
    setExcluindoCampo(campo);
    const err = await excluirAnexoFrotaInline(
      "viagem_recursos",
      recurso.id,
      campo,
      path
    );
    if (err) {
      await mebAlert(err);
      setExcluindoCampo(null);
      return;
    }
    await syncFechamentoViagem(viagemId);
    setExcluindoCampo(null);
    onAnexoAlterado();
  }

  const tipoLabel =
    recurso.tipo === "abastecimento"
      ? recurso.combustivel_tipo
        ? `Abastecimento — ${recurso.combustivel_tipo}`
        : "Abastecimento"
      : recurso.tipo === "manutencao"
        ? "Manutenção"
        : recurso.tipo === "reembolso"
          ? "Reembolso"
          : recurso.tipo === "pedagio"
            ? "Pedágio"
            : recurso.tipo === "estacionamento"
              ? "Estacionamento"
              : recurso.tipo === "descarga"
                ? "Descarga"
                : recurso.tipo === "seguro"
                ? "Seguro"
                : recurso.tipo === "monitoramento"
                  ? "Monitoramento"
                    : recurso.tipo === "arla"
                    ? "Arla"
                    : recurso.tipo === "adiantamento"
                      ? recurso.descricao?.trim()
                        ? `Adiantamento — ${recurso.descricao.trim()}`
                        : "Adiantamento"
                      : recurso.tipo === "outro"
                      ? recurso.descricao
                        ? `Outros — ${recurso.descricao}`
                        : "Outros"
                      : "Outro";

  const local =
    recurso.postos?.nome ?? recurso.oficinas?.nome ?? null;

  return (
    <li className={cn(mebFormSubsection, "text-sm")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-slate-800">{tipoLabel}</span>
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">
            R$ {Number(recurso.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
          <button
            type="button"
            onClick={onExcluir}
            disabled={excluindo}
            title="Excluir"
            className="rounded-md p-1.5 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="text-slate-600">
        {new Date(recurso.realizado_em).toLocaleString("pt-BR")}
        {local && ` · ${local}`}
        {recurso.tipo === "abastecimento" && recurso.litros != null && (
          <> · {Number(recurso.litros).toLocaleString("pt-BR")} L</>
        )}
        {recurso.tipo === "abastecimento" && recurso.km_abastecimento != null && (
          <> · KM {Number(recurso.km_abastecimento).toLocaleString("pt-BR")}</>
        )}
        {recurso.tipo === "abastecimento" && recurso.teve_desconto_combustivel && (
          <>
            {" "}
            · Desconto R${" "}
            {Number(recurso.valor_desconto_combustivel ?? 0).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
          </>
        )}
      </p>
      {recurso.descricao &&
        recurso.tipo !== "outro" &&
        recurso.tipo !== "adiantamento" && (
        <p className="mt-1 text-slate-700">{recurso.descricao}</p>
      )}
      {recurso.tipo === "adiantamento" && (
        <p className="mt-1 text-xs text-orange-700">
          Descontado da comissão no fechamento da viagem
        </p>
      )}
      {(recurso.tipo === "pedagio" || recurso.tipo === "estacionamento" || recurso.tipo === "descarga") &&
        recurso.desconta_motorista === false && (
          <p className="mt-1 text-xs text-slate-500">
            Pago pela empresa — não desconta do motorista
          </p>
        )}
      {recurso.tipo === "outro" && reembolsosVinculados && reembolsosVinculados.length > 0 && (
        <p className="mt-1 text-xs text-violet-700">
          Reembolso vinculado:{" "}
          {reembolsosVinculados
            .map((r) =>
              r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
            )
            .join(" · ")}
        </p>
      )}
      {recurso.tipo === "reembolso" && despesaVinculada && (
        <p className="mt-1 text-xs text-violet-700">
          Referente à despesa:{" "}
          <span className="font-medium text-violet-800">{despesaVinculada.descricao ?? "Outros"}</span>
        </p>
      )}
      {(anexosInline.nota_fiscal_path || anexosInline.comprovante_path) && (
        <div className="mt-2">
          <FrotaAnexosLinks
            anexos={anexosInline}
            onExcluir={excluirAnexoInline}
            excluindoCampo={excluindoCampo}
          />
        </div>
      )}
      {anexos.length > 0 && (
        <ul className="mt-2 space-y-1">
          {anexos.map((a) => (
            <AnexoLink
              key={a.id}
              anexo={a}
              onExcluido={() => {
                setAnexos((prev) => prev.filter((x) => x.id !== a.id));
                onAnexoAlterado();
              }}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function AnexoLink({
  anexo,
  onExcluido,
}: {
  anexo: Anexo;
  onExcluido: () => void;
}) {
  const [excluindo, setExcluindo] = useState(false);

  async function handleExcluir() {
    if (
      !(await mebConfirm(`Excluir o anexo "${anexo.file_name}"?`, {
        variant: "danger",
        confirmLabel: "Excluir",
      }))
    ) {
      return;
    }
    setExcluindo(true);
    const err = await excluirAnexoTabela("viagem_anexos", anexo.id, anexo.storage_path);
    setExcluindo(false);
    if (err) {
      await mebAlert(err);
      return;
    }
    onExcluido();
  }

  return (
    <li>
      <AnexoArquivoRow
        label={anexo.file_name}
        storagePath={anexo.storage_path}
        onExcluir={handleExcluir}
        excluindo={excluindo}
      />
    </li>
  );
}
