import { createClient } from "@/lib/supabase/client";
import { formatarVeiculosLabel } from "@/lib/viagem-crud";
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

export async function fetchClientesAcompanhamento(): Promise<string[]> {
  const supabase = createClient();
  const [{ data: saidas }, { data: entregas }] = await Promise.all([
    supabase.from("viagens").select("local_saida"),
    supabase.from("viagem_entregas").select("local_entrega"),
  ]);

  const nomes = new Set<string>();
  for (const row of saidas ?? []) {
    const n = row.local_saida?.trim();
    if (n) nomes.add(n);
  }
  for (const row of entregas ?? []) {
    const n = row.local_entrega?.trim();
    if (n) nomes.add(n);
  }

  return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
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

export function viagemMatchCliente(viagem: AcompanhamentoViagemItem, cliente: string): boolean {
  if (!cliente) return true;
  const alvo = cliente.trim().toLowerCase();
  if (viagem.local_saida.trim().toLowerCase() === alvo) return true;
  return viagem.entregas.some((e) => e.local_entrega.trim().toLowerCase() === alvo);
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
    const lista = viagem.entregas.map((e) => `${e.ordem}) ${e.local_entrega}`).join(" · ");
    return `${viagem.veiculos_label} com ${viagem.motorista_nome} — ${viagem.entregas.length} entregas (${lista}) — selecione a entrega atual — ${statusLabel}`;
  }

  return `${viagem.veiculos_label} com ${viagem.motorista_nome} — ${statusLabel}`;
}
