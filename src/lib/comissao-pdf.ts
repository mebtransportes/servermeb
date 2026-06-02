import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ViagemFechamento } from "@/types/fechamento";
import { totalComissaoFromFechamento } from "@/types/fechamento";
import { formatarMoeda, formatarDataBr } from "@/lib/frota-filters";

function fmtMoeda(v: number) {
  return formatarMoeda(v);
}

export function gerarPdfComissaoMotorista(opts: {
  motoristaNome: string;
  periodoLabel: string;
  fechamentos: ViagemFechamento[];
}) {
  const { motoristaNome, periodoLabel, fechamentos } = opts;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const totalComissao = fechamentos.reduce((s, f) => s + (Number(f.comissao_final) || 0), 0);
  const geradoEm = new Date().toLocaleString("pt-BR");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 100, 120);
  doc.text("MEB Gestão de Transporte", 14, 18);

  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text("Relatório de Comissão", 14, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Motorista: ${motoristaNome}`, 14, 38);
  doc.text(`Período: ${periodoLabel}`, 14, 44);
  doc.text(`Gerado em: ${geradoEm}`, 14, 50);
  doc.text(`Viagens no período: ${fechamentos.length}`, 14, 56);

  const body = fechamentos.map((f) => [
    formatarDataBr(f.data_embarque.split("T")[0]),
    (f.destino ?? "—").slice(0, 22),
    fmtMoeda(totalComissaoFromFechamento(f)), // comissão sem reembolso
    fmtMoeda(f.reembolso_valor),
    fmtMoeda(f.comissao_final),
  ]);

  autoTable(doc, {
    startY: 64,
    head: [["Data", "Destino", "Comissão 12%", "Reembolso", "Total final"]],
    body: body.length ? body : [["—", "Nenhuma viagem", "", "", ""]],
    styles: { fontSize: 7 },
    headStyles: { fillColor: [0, 120, 140] },
    margin: { left: 14, right: 14 },
  });

  let y = 64;
  const docWithTable = doc as unknown as { lastAutoTable?: { finalY: number } };
  if (docWithTable.lastAutoTable?.finalY) y = docWithTable.lastAutoTable.finalY;
  const finalY = y + 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Total de comissão: ${fmtMoeda(totalComissao)}`, 14, finalY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(motoristaNome, 14, finalY + 28);
  doc.line(14, finalY + 30, 120, finalY + 30);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Assinatura do motorista", 14, finalY + 35);

  doc.save(
    `comissao-${motoristaNome.replace(/\s+/g, "_")}_${periodoLabel.replace(/\s+/g, "_")}.pdf`
  );
}
