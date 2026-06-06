import { createClient } from "@/lib/supabase/client";
import { formatarVeiculosLabel } from "@/lib/viagem-crud";
import { carregarParceiros, type ParceiroSugestao } from "@/lib/parceiros";
export type AcompanhamentoEntrega = {
  ordem: number;
  local_entrega: string;
};

export type AcompanhamentoViagemItem = {
  id: string;
  status: string;
  saida_em: string;
  chegada_prevista_em: string;
  local_saida: string;
  numero_cte?: string | null;
  entrega_atual_ordem?: number | null;
  motorista_nome: string;
  motorista_telefone?: string | null;
  veiculos_label: string;
  entregas: AcompanhamentoEntrega[];
};

export async function fetchFornecedoresAcompanhamento(): Promise<ParceiroSugestao[]> {
  const parceiros = await carregarParceiros();
  return parceiros.filter((p) => p.tipo === "fornecedor");
}

export async function fetchViagensAcompanhamento(): Promise<AcompanhamentoViagemItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("viagens")
    .select(
      `
      id, status, saida_em, chegada_prevista_em, local_saida, numero_cte, entrega_atual_ordem,
      motoristas ( nome_completo, telefone ),
      veiculos ( nome, placa ),
      viagem_veiculos ( ordem, veiculos ( nome, placa ) ),
      viagem_entregas ( ordem, local_entrega )
    `
    )
    .order("saida_em", { ascending: false });

  if (error) {
    console.warn(error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const motoristaRaw = row.motoristas as
      | { nome_completo: string; telefone?: string | null }
      | { nome_completo: string; telefone?: string | null }[]
      | null;
    const motorista = Array.isArray(motoristaRaw) ? motoristaRaw[0] : motoristaRaw;

    const vv = row.viagem_veiculos as
      | { ordem: number; veiculos: { nome: string; placa: string } | { nome: string; placa: string }[] }[]
      | null;
    const veiculosViagem = (vv ?? [])
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => {
        const v = item.veiculos;
        return Array.isArray(v) ? v[0] : v;
      })
      .filter((v): v is { nome: string; placa: string } => !!v);

    const veiculoRaw = row.veiculos as
      | { nome: string; placa: string }
      | { nome: string; placa: string }[]
      | null;
    const veiculoFallback = Array.isArray(veiculoRaw) ? veiculoRaw[0] : veiculoRaw;
    const listaVeiculos =
      veiculosViagem.length > 0
        ? veiculosViagem
        : veiculoFallback
          ? [veiculoFallback]
          : [];

    const entregasRaw = row.viagem_entregas as AcompanhamentoEntrega[] | null;
    const entregas = (entregasRaw ?? [])
      .slice()
      .sort((a, b) => a.ordem - b.ordem);

    return {
      id: row.id,
      status: row.status as string,
      saida_em: row.saida_em,
      chegada_prevista_em: row.chegada_prevista_em,
      local_saida: row.local_saida,
      numero_cte: row.numero_cte,
      entrega_atual_ordem: row.entrega_atual_ordem,
      motorista_nome: motorista?.nome_completo ?? "—",
      motorista_telefone: motorista?.telefone ?? null,
      veiculos_label: formatarVeiculosLabel(listaVeiculos),
      entregas,
    };
  });
}

/** Viagem cuja saída corresponde ao fornecedor (origem do frete). */
export function viagemMatchFornecedor(
  viagem: AcompanhamentoViagemItem,
  fornecedor: Pick<ParceiroSugestao, "nome" | "textoCompleto">
): boolean {
  const saida = viagem.local_saida.trim().toLowerCase();
  const texto = fornecedor.textoCompleto.trim().toLowerCase();
  if (saida === texto) return true;
  const nome = fornecedor.nome.trim().toLowerCase();
  return nome.length > 0 && saida.startsWith(nome);
}

function encurtarTexto(texto: string, max = 42): string {
  const t = texto.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

export function textoResumoCurto(
  viagem: AcompanhamentoViagemItem,
  statusLabel: string
): string {
  const ordem = viagem.entrega_atual_ordem;
  const entrega = ordem
    ? viagem.entregas.find((e) => e.ordem === ordem)
    : undefined;

  if (ordem && entrega) {
    return `Entrega ${ordem} — ${encurtarTexto(entrega.local_entrega, 36)} · ${statusLabel}`;
  }
  if (viagem.entregas.length === 1) {
    return `${encurtarTexto(viagem.entregas[0].local_entrega, 40)} · ${statusLabel}`;
  }
  if (viagem.entregas.length > 1) {
    return `${viagem.entregas.length} entregas · informe a atual · ${statusLabel}`;
  }
  return statusLabel;
}

export function formatarTextoWhatsAppAcompanhamento(
  viagem: AcompanhamentoViagemItem,
  statusLabel: string
): string {
  const linhas: string[] = [
    "🚛 *MEB Transportes — Acompanhamento*",
    "",
    `👤 *Motorista:* ${viagem.motorista_nome}`,
  ];

  if (viagem.motorista_telefone) {
    linhas.push(`📱 *Telefone:* ${viagem.motorista_telefone}`);
  }

  linhas.push(
    `🚚 *Veículo:* ${viagem.veiculos_label}`,
    `📍 *Status:* ${statusLabel}`,
    `🏁 *Saída:* ${new Date(viagem.saida_em).toLocaleString("pt-BR")}`,
    `🕐 *Chegada prevista:* ${new Date(viagem.chegada_prevista_em).toLocaleString("pt-BR")}`
  );

  if (viagem.numero_cte) {
    linhas.push(`📋 *CTE:* ${viagem.numero_cte}`);
  }

  linhas.push(`📤 *Origem:* ${viagem.local_saida}`);

  const ordem = viagem.entrega_atual_ordem;
  const entregaAtual = ordem
    ? viagem.entregas.find((e) => e.ordem === ordem)
    : undefined;

  if (entregaAtual) {
    linhas.push(
      "",
      `📦 *Entrega atual:* ${ordem} — ${entregaAtual.local_entrega}`
    );
  }

  if (viagem.entregas.length > 0) {
    linhas.push("", "*Entregas:*");
    for (const e of viagem.entregas) {
      const atual = e.ordem === ordem;
      const icone = atual ? "✅" : "📍";
      const sufixo = atual ? " _(atual)_" : "";
      linhas.push(`${icone} ${e.ordem}) ${e.local_entrega}${sufixo}`);
    }
  }

  linhas.push(
    "",
    `🕒 _Atualizado: ${new Date().toLocaleString("pt-BR")}_`
  );

  return linhas.join("\n");
}

export function textoResumoAcompanhamento(viagem: AcompanhamentoViagemItem, statusLabel: string): string {
  const ordem = viagem.entrega_atual_ordem;
  const entrega = ordem
    ? viagem.entregas.find((e) => e.ordem === ordem)
    : undefined;

  if (ordem && entrega) {
    return `${viagem.veiculos_label} com ${viagem.motorista_nome} está na Entrega ${ordem} (${entrega.local_entrega}) — ${statusLabel}`;
  }

  if (viagem.entregas.length === 1) {
    return `${viagem.veiculos_label} com ${viagem.motorista_nome} — destino ${viagem.entregas[0].local_entrega} — ${statusLabel}`;
  }

  if (viagem.entregas.length > 1) {
    return `${viagem.veiculos_label} com ${viagem.motorista_nome} — ${viagem.entregas.length} entregas — selecione a entrega atual — ${statusLabel}`;
  }

  return `${viagem.veiculos_label} com ${viagem.motorista_nome} — ${statusLabel}`;
}
