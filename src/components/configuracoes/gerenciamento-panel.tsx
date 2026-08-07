"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { CalendarClock, Database, HardDrive, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MebModal,
  MebModalBody,
  MebModalFooter,
  MebModalHeader,
} from "@/components/ui/modal";
import {
  anexarDocumentoSeguro,
  excluirDocumentoSeguro,
  getAppSettings,
  getSupabaseUsage,
  listarDocumentosSeguros,
  obterUrlDocumentoSeguro,
  salvarCotasSupabase,
  salvarDominioExpiraEm,
  type DocumentoSeguroItem,
  type SupabaseUsage,
} from "@/app/(app)/configuracoes/gerenciamento/actions";
import {
  diasRestantesDominio,
  formatBytes,
  mensagemAlertaDominio,
} from "@/lib/gerenciamento";
import { formatarDataBr } from "@/lib/frota-filters";
import { cn, mebCard, mebFormSection } from "@/lib/utils";
import { mebAlert, mebConfirm } from "@/lib/meb-dialog";

function UsageBar({
  label,
  used,
  quota,
}: {
  label: string;
  used: number;
  quota: number;
}) {
  const pct = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-500">
          {formatBytes(used)} / {formatBytes(quota)} ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-[#33388d]"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

type SenhaModalState =
  | { open: false }
  | { open: true; doc: DocumentoSeguroItem; mode: "ver" | "baixar" | "excluir" };

export function GerenciamentoPanel() {
  const [pending, startTransition] = useTransition();
  const [dominio, setDominio] = useState("");
  const [quotaDbMb, setQuotaDbMb] = useState("512");
  const [quotaStorageGb, setQuotaStorageGb] = useState("1");
  const [usage, setUsage] = useState<SupabaseUsage | null>(null);
  const [docs, setDocs] = useState<DocumentoSeguroItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [titulo, setTitulo] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");

  const [senhaModal, setSenhaModal] = useState<SenhaModalState>({ open: false });
  const [senhaInput, setSenhaInput] = useState("");
  const [senhaErro, setSenhaErro] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settings, usageData, docsData] = await Promise.all([
        getAppSettings(),
        getSupabaseUsage(),
        listarDocumentosSeguros(),
      ]);
      setDominio(settings.dominio_expira_em?.slice(0, 10) ?? "");
      setQuotaDbMb(String(Math.round(settings.supabase_quota_db_bytes / (1024 * 1024))));
      setQuotaStorageGb(
        String(
          Math.round(
            (settings.supabase_quota_storage_bytes / (1024 * 1024 * 1024)) * 10
          ) / 10
        )
      );
      setUsage(usageData);
      setDocs(docsData);
    } catch (e) {
      await mebAlert(
        e instanceof Error
          ? e.message
          : "Erro ao carregar gerenciamento. Confirme se a migration 050 foi aplicada."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dias = useMemo(() => diasRestantesDominio(dominio || null), [dominio]);
  const alerta = mensagemAlertaDominio(dias);

  function salvarDominio() {
    startTransition(async () => {
      const r = await salvarDominioExpiraEm(dominio || null);
      if (!r.ok) {
        await mebAlert(r.message);
        return;
      }
      setMsg("Data do domínio salva.");
      await load();
    });
  }

  function salvarCotas() {
    startTransition(async () => {
      const dbMb = Number(quotaDbMb.replace(",", "."));
      const stGb = Number(quotaStorageGb.replace(",", "."));
      if (!Number.isFinite(dbMb) || !Number.isFinite(stGb) || dbMb <= 0 || stGb <= 0) {
        await mebAlert("Informe cotas válidas.");
        return;
      }
      const r = await salvarCotasSupabase({
        quotaDbBytes: Math.round(dbMb * 1024 * 1024),
        quotaStorageBytes: Math.round(stGb * 1024 * 1024 * 1024),
      });
      if (!r.ok) {
        await mebAlert(r.message);
        return;
      }
      setMsg("Cotas atualizadas.");
      await load();
    });
  }

  function anexar(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.set("titulo", titulo);
      fd.set("senha", senha);
      fd.set("confirmar", confirmar);
      if (arquivo) fd.set("arquivo", arquivo);
      const r = await anexarDocumentoSeguro(fd);
      if (!r.ok) {
        await mebAlert(r.message);
        return;
      }
      setTitulo("");
      setArquivo(null);
      setSenha("");
      setConfirmar("");
      setMsg("Documento anexado.");
      await load();
    });
  }

  async function confirmarSenhaModal() {
    if (!senhaModal.open) return;
    setSenhaErro("");
    const { doc, mode } = senhaModal;

    if (mode === "excluir") {
      const ok = await mebConfirm(`Excluir "${doc.titulo}"?`, {
        variant: "danger",
        confirmLabel: "Excluir",
      });
      if (!ok) return;
      const r = await excluirDocumentoSeguro(doc.id, senhaInput);
      if (!r.ok) {
        setSenhaErro(r.message);
        return;
      }
      setSenhaModal({ open: false });
      setSenhaInput("");
      setMsg("Documento excluído.");
      await load();
      return;
    }

    const r = await obterUrlDocumentoSeguro(doc.id, senhaInput);
    if (!r.ok) {
      setSenhaErro(r.message);
      return;
    }
    if (mode === "ver") {
      window.open(r.url, "_blank", "noopener,noreferrer");
    } else {
      const a = document.createElement("a");
      a.href = r.url;
      a.download = r.fileName;
      a.rel = "noopener";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setSenhaModal({ open: false });
    setSenhaInput("");
  }

  if (loading) {
    return <p className="text-slate-500">Carregando gerenciamento...</p>;
  }

  const quotaDb = Number(quotaDbMb.replace(",", ".")) * 1024 * 1024;
  const quotaSt =
    Number(quotaStorageGb.replace(",", ".")) * 1024 * 1024 * 1024;

  return (
    <div className="space-y-8">
      {msg && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {msg}
        </p>
      )}

      <section className={mebFormSection}>
        <div className="mb-4 flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-[#33388d]" />
          <h2 className="text-lg font-semibold text-[#33388d]">Vencimentos</h2>
        </div>

        <div className={cn(mebCard, "p-4")}>
          <h3 className="text-base font-bold text-[#33388d]">Domínio</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Input
              label="Expiração"
              type="date"
              value={dominio}
              onChange={(e) => setDominio(e.target.value)}
            />
            <div>
              <p className="text-sm font-medium text-slate-600">Situação</p>
              <p className="mt-2 text-sm text-slate-800">
                {dias == null
                  ? "Sem data cadastrada"
                  : dias < 0
                    ? `Vencido há ${Math.abs(dias)} dia(s)`
                    : `${dias} dia(s) restantes`}
              </p>
              {alerta && (
                <p className="mt-1 text-sm font-medium text-amber-700">{alerta}</p>
              )}
            </div>
          </div>
          <div className="mt-4">
            <Button
              type="button"
              variant="success"
              disabled={pending}
              onClick={salvarDominio}
            >
              Salvar data do domínio
            </Button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Domínio: data manual. Avisos na tela com 30, 15 e 2 dias antes (e se vencido).
          </p>
        </div>
      </section>

      <section className={mebFormSection}>
        <div className="mb-1 flex items-center gap-2">
          <Database className="h-5 w-5 text-[#33388d]" />
          <h2 className="text-lg font-semibold text-[#33388d]">Supabase</h2>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Uso atual · {new Date().toLocaleDateString("pt-BR")} · cotas editáveis abaixo
        </p>

        <div className="space-y-4">
          <UsageBar
            label="Banco de dados"
            used={usage?.database_bytes ?? 0}
            quota={Number.isFinite(quotaDb) ? quotaDb : 536870912}
          />
          <UsageBar
            label="Storage (buckets)"
            used={usage?.storage_bytes ?? 0}
            quota={Number.isFinite(quotaSt) ? quotaSt : 1073741824}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input
            label="Cota DB (MB)"
            value={quotaDbMb}
            onChange={(e) => setQuotaDbMb(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label="Cota Storage (GB)"
            value={quotaStorageGb}
            onChange={(e) => setQuotaStorageGb(e.target.value)}
            inputMode="decimal"
          />
        </div>
        <div className="mt-3">
          <Button type="button" variant="secondary" disabled={pending} onClick={salvarCotas}>
            Salvar cotas
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="ml-2"
            disabled={pending}
            onClick={() => void load()}
          >
            Atualizar uso
          </Button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className={cn(mebCard, "p-4")}>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <HardDrive className="h-4 w-4" />
              Maiores tabelas
            </h3>
            <ul className="space-y-1.5 text-sm text-slate-600">
              {(usage?.top_tables ?? []).length === 0 && (
                <li className="text-slate-400">Nenhuma tabela</li>
              )}
              {(usage?.top_tables ?? []).map((t) => (
                <li key={t.name} className="flex justify-between gap-2">
                  <span className="truncate font-mono text-xs">{t.name}</span>
                  <span className="shrink-0 tabular-nums">{formatBytes(t.bytes)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={cn(mebCard, "p-4")}>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Buckets</h3>
            <ul className="space-y-1.5 text-sm text-slate-600">
              {(usage?.buckets ?? []).length === 0 && (
                <li className="text-slate-400">Nenhum arquivo</li>
              )}
              {(usage?.buckets ?? []).map((b) => (
                <li key={b.name} className="flex justify-between gap-2">
                  <span className="truncate font-mono text-xs">{b.name}</span>
                  <span className="shrink-0 tabular-nums">
                    {b.files} arq., {formatBytes(b.bytes)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={mebFormSection}>
        <div className="mb-1 flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#33388d]" />
          <h2 className="text-lg font-semibold text-[#33388d]">Documentos seguros</h2>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Anexe PDF ou TXT com senha. Só o admin consegue ver, baixar ou excluir após
          digitar a senha.
        </p>

        <form onSubmit={anexar} className={cn(mebCard, "space-y-3 p-4")}>
          <Input
            label="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Contrato confidencial"
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-600">
              Arquivo (PDF ou TXT)
            </label>
            <input
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              className="text-sm text-slate-700"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="new-password"
              required
            />
            <Input
              label="Confirmar senha"
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" variant="success" className="w-full" disabled={pending}>
            Anexar com senha
          </Button>
        </form>

        <div className={cn(mebCard, "mt-4 p-4")}>
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Acessos restritos
          </h3>
          {docs.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum documento anexado.</p>
          ) : (
            <ul className="space-y-3">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">{d.titulo}</p>
                    <p className="truncate text-xs text-slate-500">
                      {d.file_name} · {formatBytes(d.size_bytes)} ·{" "}
                      {formatarDataBr(d.created_at.slice(0, 10))}
                      {d.created_at.length > 10
                        ? `, ${new Date(d.created_at).toLocaleTimeString("pt-BR")}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setSenhaErro("");
                        setSenhaInput("");
                        setSenhaModal({ open: true, doc: d, mode: "ver" });
                      }}
                    >
                      Ver
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setSenhaErro("");
                        setSenhaInput("");
                        setSenhaModal({ open: true, doc: d, mode: "baixar" });
                      }}
                    >
                      Baixar
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => {
                        setSenhaErro("");
                        setSenhaInput("");
                        setSenhaModal({ open: true, doc: d, mode: "excluir" });
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <MebModal
        open={senhaModal.open}
        onClose={() => {
          setSenhaModal({ open: false });
          setSenhaInput("");
          setSenhaErro("");
        }}
        maxWidth="max-w-sm"
      >
        <div className="space-y-4 p-5">
          <MebModalHeader
            title="Digite a senha"
            description={
              senhaModal.open
                ? `${senhaModal.mode === "excluir" ? "Excluir" : senhaModal.mode === "baixar" ? "Baixar" : "Abrir"}: ${senhaModal.doc.titulo}`
                : undefined
            }
            onClose={() => {
              setSenhaModal({ open: false });
              setSenhaInput("");
              setSenhaErro("");
            }}
          />
          <MebModalBody>
            <Input
              tone="dark"
              label="Senha do arquivo"
              type="password"
              value={senhaInput}
              onChange={(e) => {
                setSenhaInput(e.target.value);
                setSenhaErro("");
              }}
              error={senhaErro || undefined}
              autoFocus
            />
          </MebModalBody>
          <MebModalFooter>
            <Button
              type="button"
              variant="success"
              onClick={() => void confirmarSenhaModal()}
              disabled={!senhaInput || pending}
            >
              Confirmar
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-slate-300"
              onClick={() => {
                setSenhaModal({ open: false });
                setSenhaInput("");
              }}
            >
              Cancelar
            </Button>
          </MebModalFooter>
        </div>
      </MebModal>
    </div>
  );
}
