import { createClient } from "@/lib/supabase/client";

export async function atualizarEntregaAtual(
  viagemId: string,
  ordem: number | null
): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase
    .from("viagens")
    .update({ entrega_atual_ordem: ordem })
    .eq("id", viagemId);
  return error?.message ?? null;
}
