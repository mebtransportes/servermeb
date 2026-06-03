"use client";

import type { PontoGraficoEmpresarial } from "@/lib/custos-empresariais";
import type { PontoGraficoMensal } from "@/lib/grafico-mensal";
import { EvolucaoMensalChart } from "@/components/financeiro/evolucao-mensal-chart";

export function CustosEmpresariaisChart({ dados }: { dados: PontoGraficoEmpresarial[] }) {
  return (
    <EvolucaoMensalChart
      dados={dados as PontoGraficoMensal[]}
      titulo="Evolução dos custos empresariais"
      subtitulo="Últimos 6 meses · comissões, manutenções, abastecimentos e despesas cadastradas"
      tema="purple"
    />
  );
}
