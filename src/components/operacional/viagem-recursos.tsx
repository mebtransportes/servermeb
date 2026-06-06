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
import { Plus, Trash2 } from "lucide-react";
import { AnexoArquivoRow } from "@/components/shared/anexo-arquivo-row";
import { FrotaAnexosLinks } from "@/components/frota/frota-anexos-links";
import { excluirAnexoFrotaInline, excluirAnexoTabela } from "@/lib/anexos-crud";
import type { CampoAnexoFrota } from "@/lib/anexos-crud";
import { FileUploadMultiple } from "@/components/ui/file-upload";
import { AnexosFrotaCampos } from "@/components/frota/anexos-campos";
import { salvarAnexosFrota } from "@/lib/frota-anexos";
import { syncFechamentoViagem } from "@/lib/fechamento-viagem";

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
  nota_fiscal_path?: string | null;
  nota_fiscal_nome?: string | null;
  comprovante_path?: string | null;
  comprovante_nome?: string | null;
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
  const [notaFiscal, setNotaFiscal] = useState<File | null>(null);
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

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
    ]).then(([p, o]) => {
      setPostos(p.data ?? []);
      setOficinas(o.data ?? []);
    });
  }, [viagemId]);

  const recursosGastos = recursos.filter((r) => r.tipo !== "reembolso");
  const recursosReembolso = recursos.filter((r) => r.tipo === "reembolso");

  async function handleAdd(e: React.FormEvent, tipoFixo?: "reembolso") {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const tipoLancamento = tipoFixo ?? tipo;

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
    if (tipoLancamento === "abastecimento" && litros) {
      payload.litros = parseBrNumber(litros);
    }
    if (tipoLancamento === "manutencao") payload.status_frota = "FINALIZADO";

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

    setShowFormGasto(false);
    setShowFormReembolso(false);
    setValor("");
    setDescricao("");
    setPostoId("");
    setOficinaId("");
    setRealizadoEm("");
    setKmVeiculo("");
    setLitros("");
    setNotaFiscal(null);
    setComprovante(null);
    setFiles([]);
    await syncFechamentoViagem(viagemId);
    setSaving(false);
    load();
  }

  async function handleExcluir(recursoId: string) {
    if (
      !confirm(
        "Excluir este lançamento? Os anexos vinculados também serão removidos."
      )
    ) {
      return;
    }
    setExcluindoId(recursoId);
    const supabase = createClient();
    const { error } = await supabase
      .from("viagem_recursos")
      .delete()
      .eq("id", recursoId);

    if (error) {
      alert(error.message);
      setExcluindoId(null);
      return;
    }

    await syncFechamentoViagem(viagemId);
    setExcluindoId(null);
    load();
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Gastos da viagem</h3>
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
          className="space-y-3 rounded-lg border border-amber-900/30 bg-amber-950/10 p-4"
        >
          <Select
            label="Tipo de gasto"
            value={tipo}
            onChange={(e) => {
              const t = e.target.value as ViagemRecursoTipo;
              setTipo(t);
              if (t !== "abastecimento") setLitros("");
            }}
            options={[
              { value: "abastecimento", label: "Abastecimento" },
              { value: "manutencao", label: "Manutenção" },
              { value: "pedagio", label: "Pedágio" },
              { value: "arla", label: "Arla" },
            ]}
          />
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
              label="Quilometragem do veículo (opcional)"
              decimalPlaces={0}
              value={kmVeiculo}
              onChange={setKmVeiculo}
              placeholder="Ex: 125.430"
            />
          )}
          {tipo === "abastecimento" && (
            <>
              <Select
                label="Posto"
                value={postoId}
                onChange={(e) => setPostoId(e.target.value)}
                options={[
                  { value: "", label: "Selecione ou deixe em branco" },
                  ...postos.map((p) => ({ value: p.id, label: p.nome })),
                ]}
              />
              <BrNumberInput
                label="Litros abastecidos (opcional)"
                decimalPlaces={2}
                value={litros}
                onChange={setLitros}
                placeholder="Ex: 150,50"
              />
            </>
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
              tipo === "pedagio"
                ? "Ex: praça de pedágio, rota, etc."
                : tipo === "arla"
                  ? "Ex: litros, posto, nota fiscal, etc."
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
              Salvar gasto
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowFormGasto(false)}>
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
              onExcluir={() => handleExcluir(r.id)}
              excluindo={excluindoId === r.id}
              onAnexoAlterado={load}
            />
          ))}
        </ul>
      )}
      </section>

      <section className="space-y-4 border-t border-slate-700/50 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-violet-300">Reembolso ao motorista</h3>
            <p className="text-xs text-slate-500">
              Valores pagos pelo motorista — não entram no total de gastos
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
            className="space-y-3 rounded-lg border border-violet-900/30 bg-violet-950/10 p-4"
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
              <Button type="submit" disabled={saving}>
                Salvar reembolso
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowFormReembolso(false)}>
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
                onExcluir={() => handleExcluir(r.id)}
                excluindo={excluindoId === r.id}
                onAnexoAlterado={load}
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
}: {
  recurso: Recurso;
  viagemId: string;
  onExcluir: () => void;
  excluindo: boolean;
  onAnexoAlterado: () => void;
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
    if (!confirm("Excluir este documento?")) return;
    setExcluindoCampo(campo);
    const err = await excluirAnexoFrotaInline(
      "viagem_recursos",
      recurso.id,
      campo,
      path
    );
    if (err) {
      alert(err);
      setExcluindoCampo(null);
      return;
    }
    await syncFechamentoViagem(viagemId);
    setExcluindoCampo(null);
    onAnexoAlterado();
  }

  const tipoLabel =
    recurso.tipo === "abastecimento"
      ? "Abastecimento"
      : recurso.tipo === "manutencao"
        ? "Manutenção"
        : recurso.tipo === "reembolso"
          ? "Reembolso"
          : recurso.tipo === "pedagio"
            ? "Pedágio"
            : recurso.tipo === "arla"
              ? "Arla"
              : "Outro";

  const local =
    recurso.postos?.nome ?? recurso.oficinas?.nome ?? null;

  return (
    <li className="rounded-lg border border-slate-700/40 bg-slate-800/30 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-cyan-300">{tipoLabel}</span>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">
            R$ {Number(recurso.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
          <button
            type="button"
            onClick={onExcluir}
            disabled={excluindo}
            title="Excluir"
            className="rounded-md p-1.5 text-red-400 transition hover:bg-red-950/50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="text-slate-400">
        {new Date(recurso.realizado_em).toLocaleString("pt-BR")}
        {local && ` · ${local}`}
        {recurso.tipo === "abastecimento" && recurso.litros != null && (
          <> · {Number(recurso.litros).toLocaleString("pt-BR")} L</>
        )}
        {recurso.tipo === "abastecimento" && recurso.km_abastecimento != null && (
          <> · KM {Number(recurso.km_abastecimento).toLocaleString("pt-BR")}</>
        )}
      </p>
      {recurso.descricao && <p className="mt-1 text-slate-300">{recurso.descricao}</p>}
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
    if (!confirm(`Excluir o anexo "${anexo.file_name}"?`)) return;
    setExcluindo(true);
    const err = await excluirAnexoTabela("viagem_anexos", anexo.id, anexo.storage_path);
    setExcluindo(false);
    if (err) {
      alert(err);
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
