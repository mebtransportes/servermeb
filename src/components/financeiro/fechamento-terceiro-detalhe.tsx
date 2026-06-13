"use client";

import type { ViagemFechamento } from "@/types/fechamento";
import { getIcmsPercent } from "@/types/fechamento";
import type { useFechamentoValores } from "@/components/financeiro/fechamento-viagem-detalhe";
import { formatarMoeda } from "@/lib/frota-filters";
import {
  extrairPlacaVeiculo,
  formatPeriodoViagem,
} from "@/lib/fechamento-format";
import type { FechamentoOutroDespesa } from "@/lib/fechamento-outros-despesas";
import {
  FechamentoDestaque,
  FechamentoLinhaCampos,
  FechamentoListaItens,
  FechamentoSecao,
} from "@/components/financeiro/fechamento-layout";

export function FechamentoTerceiroDetalhe({
  f,
  v,
  outrosDespesas = [],
  showComissaoFinal = true,
}: {
  f: ViagemFechamento;
  v: ReturnType<typeof useFechamentoValores>;
  outrosDespesas?: FechamentoOutroDespesa[];
  showComissaoFinal?: boolean;
}) {
  const placa = extrairPlacaVeiculo(f.veiculo_label);
  const icmsPct = getIcmsPercent(f);

  const outrosItens = outrosDespesas.map((d) => ({
    nome: d.nome,
    valor: formatarMoeda(d.valor),
  }));

  return (
    <div>
      <FechamentoLinhaCampos
        cols={2}
        campos={[
          { rotulo: "Motorista", valor: f.motorista_nome },
          { rotulo: "Placa do veículo", valor: placa },
        ]}
      />

      <FechamentoLinhaCampos
        cols={1}
        campos={[
          {
            rotulo: "Saída — Chegada — Duração",
            valor: formatPeriodoViagem(f.data_embarque, f.chegada_em),
          },
        ]}
      />

      <FechamentoLinhaCampos
        cols={2}
        campos={[
          { rotulo: "Local de saída", valor: f.local_embarque || "—" },
          { rotulo: "Local de entrega", valor: f.destino ?? "—" },
        ]}
      />

      <FechamentoLinhaCampos
        cols={1}
        campos={[{ rotulo: "CTE", valor: f.numero_cte ?? "—" }]}
      />

      <FechamentoSecao titulo="Controle de gastos">
        <FechamentoLinhaCampos
          cols={2}
          campos={[
            { rotulo: "Valor de seguro (0,09% da carga)", valor: formatarMoeda(f.seguro_valor ?? 0) },
            { rotulo: "Valor do monitoramento", valor: formatarMoeda(f.monitoramento_valor ?? 0) },
          ]}
        />
        <FechamentoListaItens titulo="Outros gastos" itens={outrosItens} />
      </FechamentoSecao>

      <FechamentoSecao titulo="Cálculo geral">
        <FechamentoLinhaCampos
          cols={3}
          campos={[
            { rotulo: "Frete bruto", valor: formatarMoeda(f.valor_frete) },
            {
              rotulo: `Frete líquido (− ${icmsPct}% ICMS)`,
              valor: formatarMoeda(v.frete_liquido),
            },
            { rotulo: "Valor do imposto (ICMS)", valor: formatarMoeda(v.valor_icms) },
          ]}
        />
        <FechamentoLinhaCampos
          cols={2}
          campos={[
            { rotulo: "Valor total de despesas", valor: formatarMoeda(v.despesas) },
            {
              rotulo: "Valor líquido para repassar ao terceiro",
              valor: formatarMoeda(v.comissao_final),
            },
          ]}
        />
        <p className="text-[10px] text-slate-500">
          Valor líquido = frete sem ICMS − despesas (seguro, monitoramento e outros)
        </p>
      </FechamentoSecao>

      {showComissaoFinal && (
        <FechamentoDestaque
          rotulo="Valor líquido para repassar ao terceiro"
          subtitulo="Frete líquido − despesas"
          valor={formatarMoeda(v.comissao_final)}
          tema="cyan"
        />
      )}
    </div>
  );
}
