import { FileText } from "lucide-react";

export default function FrotaDocumentacaoPage() {
  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <FileText className="h-8 w-8 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold">Documentação</h1>
          <p className="text-slate-400">Controle de documentos da frota</p>
        </div>
      </header>
      <div className="rounded-xl border border-dashed border-slate-600 bg-slate-800/30 p-12 text-center text-slate-500">
        Módulo em desenvolvimento — vencimentos de CRLV, IPVA e CNH integrados ao cadastro.
      </div>
    </div>
  );
}
