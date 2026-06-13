import type { jsPDF } from "jspdf";

const MARGIN = 14;
const PAGE_W = 210;

/** Altura reservada no fim da página para declaração + assinaturas. */
export const RODAPE_ASSINATURA_ALTURA = 32;

type RodapeReciboOpts = {
  y: number;
  beneficiarioNome: string;
  ehTerceiro?: boolean;
  textoDeclaracao?: string;
};

/** Posição Y onde o bloco de assinaturas deve começar (ancorado no rodapé da página). */
export function calcularYInicioRodapeAssinatura(
  doc: jsPDF,
  contentY: number
): { y: number; novaPagina: boolean } {
  const pageH = doc.internal.pageSize.getHeight();
  const rodapeY = pageH - MARGIN - RODAPE_ASSINATURA_ALTURA;

  if (contentY <= rodapeY) {
    return { y: rodapeY, novaPagina: false };
  }

  return { y: rodapeY, novaPagina: true };
}

/** Garante espaço e desenha rodapé com assinaturas lado a lado (MEB + beneficiário). */
export function desenharRodapeAssinaturasRecibo(
  doc: jsPDF,
  opts: RodapeReciboOpts
): number {
  const contentW = PAGE_W - MARGIN * 2;
  const { y: rodapeY, novaPagina } = calcularYInicioRodapeAssinatura(doc, opts.y);

  if (novaPagina) {
    doc.addPage();
  }

  let y = rodapeY;

  const texto =
    opts.textoDeclaracao ??
    (opts.ehTerceiro
      ? "Declaro ter recebido da MEB Transportes o valor líquido acima, referente ao repasse do frete das viagens relacionadas neste recibo."
      : "Declaro ter recebido da MEB Transportes o valor líquido acima, referente à comissão das viagens relacionadas neste recibo.");

  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  const linhasDecl = doc.splitTextToSize(texto, contentW);
  doc.text(linhasDecl, MARGIN, y);
  y += linhasDecl.length * 2.8 + 4;

  const assinY = y + 8;
  const assinW = (contentW - 10) / 2;
  const esqX = MARGIN;
  const dirX = MARGIN + assinW + 10;

  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.35);
  doc.line(esqX, assinY, esqX + assinW, assinY);
  doc.line(dirX, assinY, dirX + assinW, assinY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text("MEB Transportes", esqX + assinW / 2, assinY + 4.5, { align: "center" });
  doc.text(opts.beneficiarioNome, dirX + assinW / 2, assinY + 4.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Assinatura do pagador", esqX + assinW / 2, assinY + 8.5, { align: "center" });
  doc.text(
    opts.ehTerceiro ? "Assinatura do transportador terceiro" : "Assinatura do motorista",
    dirX + assinW / 2,
    assinY + 8.5,
    { align: "center" }
  );

  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Documento gerado eletronicamente — válido mediante assinatura das partes.",
    PAGE_W / 2,
    assinY + 13,
    { align: "center", maxWidth: contentW }
  );

  return assinY + 16;
}
