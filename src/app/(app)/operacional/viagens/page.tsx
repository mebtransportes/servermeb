"use client";

import { useState } from "react";
import { Route } from "lucide-react";
import { ViagemForm } from "@/components/operacional/viagem-form";
import { Button } from "@/components/ui/button";

export default function CadastroViagensPage() {
  const [saved, setSaved] = useState(false);

  if (saved) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-2xl font-bold text-emerald-400">Viagem cadastrada!</h1>
        <p className="mt-2 text-slate-400">
          A viagem entrou com status <strong>EM ANDAMENTO</strong>. Acompanhe em
          Operacional → Acompanhamento.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => setSaved(false)}>Cadastrar outra</Button>
          <Button variant="secondary" onClick={() => (window.location.href = "/operacional/acompanhamento")}>
            Ir para acompanhamento
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8 flex items-center gap-3">
        <Route className="h-8 w-8 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold">Cadastro de Viagens</h1>
          <p className="text-slate-400">
            Selecione motorista e veículo — só prossegue se estiverem aptos
          </p>
        </div>
      </header>
      <ViagemForm onSaved={() => setSaved(true)} />
    </div>
  );
}
