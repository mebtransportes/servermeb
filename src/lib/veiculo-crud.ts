import { createClient } from "@/lib/supabase/client";

export type ExcluirVeiculoResult = {
  ok: boolean;
  message?: string;
};

/**
 * Exclui um veículo do cadastro, limpando vínculos que bloqueariam a FK.
 * Se for o único veículo de alguma viagem, a exclusão é bloqueada.
 */
export async function excluirVeiculo(veiculoId: string): Promise<ExcluirVeiculoResult> {
  if (!veiculoId) return { ok: false, message: "Veículo inválido." };

  const supabase = createClient();

  const { data: vinculos, error: errVinculos } = await supabase
    .from("viagem_veiculos")
    .select("viagem_id")
    .eq("veiculo_id", veiculoId);

  if (errVinculos) {
    return { ok: false, message: errVinculos.message };
  }

  const { data: viagensPrimario, error: errPrimario } = await supabase
    .from("viagens")
    .select("id")
    .eq("veiculo_id", veiculoId);

  if (errPrimario) {
    return { ok: false, message: errPrimario.message };
  }

  const viagemIds = [
    ...new Set([
      ...(vinculos ?? []).map((v) => v.viagem_id as string),
      ...(viagensPrimario ?? []).map((v) => v.id as string),
    ]),
  ];

  for (const viagemId of viagemIds) {
    const { data: vv } = await supabase
      .from("viagem_veiculos")
      .select("veiculo_id, ordem")
      .eq("viagem_id", viagemId)
      .order("ordem");

    const outros = (vv ?? [])
      .map((r) => r.veiculo_id as string)
      .filter((id) => id !== veiculoId);

    const { data: viagem } = await supabase
      .from("viagens")
      .select("id, veiculo_id")
      .eq("id", viagemId)
      .maybeSingle();

    const primarioEhEste = viagem?.veiculo_id === veiculoId;

    if (primarioEhEste && outros.length === 0) {
      return {
        ok: false,
        message:
          "Não é possível excluir: este veículo é o único cadastrado em pelo menos uma viagem. Edite ou exclua essa viagem antes, ou troque o caminhão nela.",
      };
    }

    if (primarioEhEste && outros.length > 0) {
      const { error: upErr } = await supabase
        .from("viagens")
        .update({ veiculo_id: outros[0] })
        .eq("id", viagemId);
      if (upErr) {
        return { ok: false, message: upErr.message };
      }
    }
  }

  const { error: delVv } = await supabase
    .from("viagem_veiculos")
    .delete()
    .eq("veiculo_id", veiculoId);
  if (delVv) {
    return { ok: false, message: delVv.message };
  }

  await supabase
    .from("frota_abastecimentos")
    .update({ veiculo_id: null })
    .eq("veiculo_id", veiculoId);
  await supabase
    .from("frota_manutencoes")
    .update({ veiculo_id: null })
    .eq("veiculo_id", veiculoId);

  const { error: delVeic } = await supabase
    .from("veiculos")
    .delete()
    .eq("id", veiculoId);

  if (delVeic) {
    return {
      ok: false,
      message:
        delVeic.message.includes("foreign key") || delVeic.code === "23503"
          ? "Não foi possível excluir: este veículo ainda está referenciado em outros registros do sistema."
          : delVeic.message,
    };
  }

  return { ok: true };
}
