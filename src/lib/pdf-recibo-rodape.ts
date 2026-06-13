import type { jsPDF } from "jspdf";

const MARGIN = 14;
const PAGE_W = 210;
const BLOCO_ASSINATURA_H = 36;

type RodapeReciboOpts = {
  y: number;
  beneficiarioNome: string;
  ehTerceiro?: boolean;
  textoDeclaracao?: string;
};

/** Garante espaço e desenha rodapé com assinaturas lado a lado (MEB + beneficiário). */
export function desenharRodapeAssinaturasRecibo(
  doc: jsPDF,
  opts: RodapeReciboOpts
): number {
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = PAGE_W - MARGIN * 2;
  let y = opts.y + 6;

  const texto =
    opts.textoDeclaracao ??
    (opts.ehTerceiro
      ? "Declaro ter recebido da MEB Transportes o valor líquido acima, referente ao repasse do frete das viagens relacionadas neste recibo."
      : "Declaro ter recebido da MEB Transportes o valor líquido acima, referente à comissão das viagens relacionadas neste recibo.");

  if (y + BLOCO_ASSINATURA_H + 14 > pageH - MARGIN) {
    doc.addPage();
    y = MARGIN + 4;
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const linhasDecl = doc.splitTextToSize(texto, contentW);
  doc.text(linhasDecl, MARGIN, y);
  y += linhasDecl.length * 3.5 + 8;

  if (y + BLOCO_ASSINATURA_H > pageH - MARGIN) {
    doc.addPage();
    y = MARGIN + 20;
  }

  const assinY = y + 14;
  const assinW = (contentW - 12) / 2;
  const esqX = MARGIN;
  const dirX = MARGIN + assinW + 12;

  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.line(esqX, assinY, esqX + assinW, assinY);
  doc.line(dirX, assinY, dirX + assinW, assinY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("MEB Transportes", esqX + assinW / 2, assinY + 5, { align: "center" });
  doc.text(opts.beneficiarioNome, dirX + assinW / 2, assinY + 5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Assinatura do pagador", esqX + assinW / 2, assinY + 9.5, { align: "center" });
  doc.text(
    opts.ehTerceiro ? "Assinatura do transportador terceiro" : "Assinatura do motorista",
    dirX + assinW / 2,
    assinY + 9.5,
    { align: "center" }
  );

  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Documento gerado eletronicamente — válido mediante assinatura das partes.",
    MARGIN,
    assinY + 16,
    { align: "center", maxWidth: contentW }
  );

  return assinY + 20;
}
