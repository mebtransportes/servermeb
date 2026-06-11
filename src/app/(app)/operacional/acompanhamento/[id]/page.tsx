"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViagemDetail } from "@/components/operacional/viagem-detail";
import { mebFormSection } from "@/lib/utils";

export default function AcompanhamentoViagemPage() {
  const params = useParams();
  const router = useRouter();
  const viagemId = typeof params.id === "string" ? params.id : "";

  if (!viagemId) {
    return (
      <div className="space-y-4">
        <p className="text-slate-500">Viagem não encontrada.</p>
        <Link href="/operacional/acompanhamento">
          <Button type="button" variant="secondary">
            Voltar ao acompanhamento
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            className="h-9 px-2"
            onClick={() => router.push("/operacional/acompanhamento")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            <MapPinned className="h-7 w-7 text-slate-400" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Editar viagem</h1>
              <p className="text-sm text-slate-500">
                Status, canhotos, recursos e demais informações
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className={mebFormSection}>
        <ViagemDetail
          viagemId={viagemId}
          onUpdated={() => router.refresh()}
        />
      </section>
    </div>
  );
}
