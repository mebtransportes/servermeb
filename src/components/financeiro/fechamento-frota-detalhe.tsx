"use client";

import type { ViagemFechamento } from "@/types/fechamento";
import {
  formatConsumoKmLitro,
  getComissaoPercent,
  getIcmsPercent,
} from "@/types/fechamento";
import type { useFechamentoValores } from "@/components/financeiro/fechamento-viagem-detalhe";
import { formatarMoeda } from "@/lib/frota-filters";
import {
  extrairPlacaVeiculo,
  formatKm,
  formatLitros,
  formatPeriodoViagem,
} from "@/lib/fechamento-format";
import type { FechamentoOutroDespesa } from "@/lib/fechamento-outros-despesas";
import type { FechamentoAdiantamento } from "@/lib/fechamento-adiantamentos";
import {
  FechamentoDestaque,
  FechamentoLinhaCampos,
  FechamentoListaItens,
  FechamentoSecao,
} from "@/components/financeiro/fechamento-layout";

export function FechamentoFrotaDetalhe({
  f,
  v,
  outrosDespesas = [],
  adiantamentos = [],
  showComissaoFinal = true,
}: {
  f: ViagemFechamento;
  v: ReturnType<typeof useFechamentoValores>;
  outrosDespesas?: FechamentoOutroDespesa[];
  adiantamentos?: FechamentoAdiantamento[];
  showComissaoFinal?: boolean;
}) {
  const placa = extrairPlacaVeiculo(f.veiculo_label);
  const icmsPct = getIcmsPercent(f);
  const comPct = getComissaoPercent(f);

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
          cols={3}
          campos={[
            { rotulo: "KM inicial da viagem", valor: formatKm(f.km_odometro_inicial) },
            {
              rotulo: "KM final após abastecer",
              valor: formatKm(f.km_final_abastecimento ?? f.km_odometro_final),
            },
            { rotulo: "Total KM rodado", valor: formatKm(v.kmRodado) },
          ]}
        />
        <FechamentoLinhaCampos
          cols={3}
          campos={[
            { rotulo: "Total gasto com abastecimento", valor: formatarMoeda(f.abastecimento_valor) },
            {
              rotulo: "Total desconto em abastecimentos",
              valor: formatarMoeda(f.abastecimento_desconto_total ?? 0),
            },
            { rotulo: "Total litros abastecidos", valor: formatLitros(v.litrosViagem) },
          ]}
        />
        <FechamentoLinhaCampos
          cols={1}
          campos={[{ rotulo: "KM por litro", valor: formatConsumoKmLitro(v.consumoKmLitro) }]}
        />
        <FechamentoLinhaCampos
          cols={2}
          campos={[
            { rotulo: "Total valor da Arla", valor: formatarMoeda(f.arla_valor) },
            { rotulo: "Valor gasto com manutenção", valor: formatarMoeda(f.manutencao_total) },
          ]}
        />
        <FechamentoLinhaCampos
          cols={3}
          campos={[
            { rotulo: "Valor gasto com pedágio", valor: formatarMoeda(f.pedagio_valor) },
            {
              rotulo: "Valor gasto com estacionamento",
              valor: formatarMoeda(f.estacionamento_valor ?? 0),
            },
            { rotulo: "Valor gasto com descarga", valor: formatarMoeda(f.descarga_valor ?? 0) },
          ]}
        />
        <FechamentoListaItens titulo="Outras despesas" itens={outrosItens} />
      </FechamentoSecao>

      <FechamentoSecao titulo="Motorista">
        <FechamentoLinhaCampos
          cols={2}
          campos={[
            { rotulo: "Adiantamentos", valor: formatarMoeda(f.adiantamento_valor ?? 0) },
            { rotulo: "Reembolsos", valor: formatarMoeda(f.reembolso_valor) },
          ]}
        />
        {adiantamentos.length > 0 && (
          <FechamentoListaItens
            titulo="Detalhe dos adiantamentos"
            itens={adiantamentos.map((a) => ({
              nome: a.descricao?.trim() || "Adiantamento",
              valor: formatarMoeda(a.valor),
            }))}
          />
        )}
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
              rotulo: "Despesas do motorista (sem combustível e manut.)",
              valor: formatarMoeda(v.despesasMotorista),
            },
          ]}
        />
        <FechamentoLinhaCampos
          cols={2}
          campos={[
            {
              rotulo: "Frete líquido retirando os gastos totais",
              valor: formatarMoeda(v.frete_menos_gastos_totais ?? v.frete_menos_gastos ?? 0),
            },
            {
              rotulo: "Frete líquido retirando os gastos do motorista",
              valor: formatarMoeda(v.frete_menos_gastos_motorista ?? 0),
            },
          ]}
        />
        <FechamentoLinhaCampos
          cols={2}
          campos={[
            {
              rotulo: `Comissão bruta para recebimento (${comPct}%)`,
              valor: formatarMoeda(v.comissao_bruta ?? v.total_comissao),
            },
            {
              rotulo: "Comissão líquida para recebimento",
              valor: formatarMoeda(v.comissao_final),
            },
          ]}
        />
        <p className="text-[10px] text-slate-500">
          Comissão bruta = {comPct}% sobre frete líquido − gastos do motorista (sem combustível e
          manutenção). Comissão líquida = comissão bruta + reembolsos − adiantamentos.
        </p>
      </FechamentoSecao>

      {showComissaoFinal && (
        <FechamentoDestaque
          rotulo="Comissão líquida para recebimento"
          subtitulo="Comissão bruta + reembolsos − adiantamentos"
          valor={formatarMoeda(v.comissao_final)}
        />
      )}
    </div>
  );
}
