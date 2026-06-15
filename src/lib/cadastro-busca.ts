export function normalizarBusca(termo: string): string {
  return termo.trim().toLowerCase();
}

export function normalizarPlaca(placa: string): string {
  return placa.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function normalizarDocumento(doc: string): string {
  return doc.replace(/\D/g, "");
}

export function matchPlaca(placa: string | null | undefined, termo: string): boolean {
  const q = normalizarPlaca(termo);
  if (!q) return true;
  if (!placa) return false;
  return normalizarPlaca(placa).includes(q);
}

export function matchNomeOuDocumento(
  nome: string,
  documento: string | null | undefined,
  termo: string
): boolean {
  const q = normalizarBusca(termo);
  if (!q) return true;
  if (normalizarBusca(nome).includes(q)) return true;
  if (!documento) return false;
  const qDoc = normalizarDocumento(termo);
  if (qDoc && normalizarDocumento(documento).includes(qDoc)) return true;
  return normalizarBusca(documento).includes(q);
}
