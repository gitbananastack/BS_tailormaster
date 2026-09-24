import PDFDocument from "pdfkit";
import type { CompanySettings } from "@/lib/company-settings";

type InvoiceLine = { description: string; quantity: number; rate: number; amount: number };
type InvoiceData = {
  invoiceNumber: string; amount: number; subtotal: number; gstPercent: number; gstAmount: number; lineItems: unknown; issueDate: Date; dueDate: Date | null; description: string | null; notes: string | null;
  order: { orderNumber: string; garmentName: string; customer: { name: string; phone: string | null; address: string | null }; items: { itemName: string; sizeQuantities: { quantity: number }[] }[] };
};

const currency = (value: number) => `INR ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function validLines(value: unknown): InvoiceLine[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is InvoiceLine => !!item && typeof item === "object" && typeof item.description === "string" && Number.isFinite(Number(item.quantity)) && Number.isFinite(Number(item.rate)) && Number.isFinite(Number(item.amount))).map((item) => ({ description: item.description, quantity: Number(item.quantity), rate: Number(item.rate), amount: Number(item.amount) }));
}

export async function createInvoicePdf(invoice: InvoiceData, company: CompanySettings) {
  const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: `Invoice ${invoice.invoiceNumber}`, Author: company.companyName } });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const finished = new Promise<Buffer>((resolve, reject) => { doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  const green = "#176A4B", ink = "#18251F", muted = "#68766F", line = "#DCE5DF", soft = "#EEF6F1";
  const left = 48, right = 547, width = 499;

  doc.rect(0, 0, 595.28, 164).fill(green);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(20).text(company.companyName, left, 26, { width });
  let headerY = 58;
  if (company.companyAddress) { doc.font("Helvetica").fontSize(9).fillColor("#E0F0E7").text(company.companyAddress, left, headerY, { width, lineGap: 2 }); headerY += doc.heightOfString(company.companyAddress, { width, lineGap: 2 }) + 5; }
  const contacts = [company.companyPhone, company.companyEmail].filter(Boolean).join("  |  ");
  if (contacts) { doc.font("Helvetica").fontSize(9).fillColor("#E0F0E7").text(contacts, left, headerY, { width }); headerY += 15; }
  if (company.companyGstin) doc.font("Helvetica-Bold").fontSize(9).fillColor("#FFFFFF").text(`GSTIN: ${company.companyGstin}`, left, headerY, { width });

  doc.fillColor(ink).font("Helvetica-Bold").fontSize(25).text("TAX INVOICE", left, 190);
  doc.font("Helvetica").fontSize(8).fillColor(muted).text("Invoice number", 350, 189).fillColor(ink).font("Helvetica-Bold").fontSize(10).text(invoice.invoiceNumber, 350, 202, { width: 197, align: "right" });
  doc.font("Helvetica").fontSize(8).fillColor(muted).text("Issue date", 350, 224).fillColor(ink).font("Helvetica-Bold").fontSize(9).text(invoice.issueDate.toLocaleDateString("en-IN"), 350, 237, { width: 82, align: "right" });
  if (invoice.dueDate) doc.font("Helvetica").fontSize(8).fillColor(muted).text("Due date", 455, 224).fillColor(ink).font("Helvetica-Bold").fontSize(9).text(invoice.dueDate.toLocaleDateString("en-IN"), 455, 237, { width: 92, align: "right" });

  doc.roundedRect(left, 266, width, 73, 8).fill(soft);
  doc.fillColor(green).font("Helvetica-Bold").fontSize(8).text("BILL TO", 64, 280);
  doc.fillColor(ink).fontSize(13).text(invoice.order.customer.name, 64, 294, { width: 300 });
  doc.font("Helvetica").fontSize(8).fillColor(muted).text([invoice.order.customer.address, invoice.order.customer.phone].filter(Boolean).join(" | ") || "Customer contact not provided", 64, 313, { width: 300 });
  doc.fillColor(muted).font("Helvetica").fontSize(8).text("JOB ORDER", 410, 280, { width: 115, align: "right" });
  doc.fillColor(ink).font("Helvetica-Bold").fontSize(10).text(invoice.order.orderNumber, 410, 294, { width: 115, align: "right" });
  doc.font("Helvetica").fontSize(8).fillColor(muted).text(invoice.order.garmentName, 410, 311, { width: 115, align: "right" });

  const items = validLines(invoice.lineItems);
  let y = 368;
  doc.rect(left, y, width, 25).fill(green);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8).text("#", 58, y + 8).text("DESCRIPTION / DESIGN CODE", 79, y + 8).text("QTY", 353, y + 8, { width: 38, align: "right" }).text("RATE", 401, y + 8, { width: 58, align: "right" }).text("AMOUNT", 469, y + 8, { width: 68, align: "right" });
  y += 25;
  items.forEach((item, index) => {
    const rowHeight = Math.max(34, doc.font("Helvetica").fontSize(9).heightOfString(item.description, { width: 250 }) + 18);
    if (index % 2 === 1) doc.rect(left, y, width, rowHeight).fill("#F8FAF9");
    doc.fillColor(muted).font("Helvetica").fontSize(8).text(String(index + 1), 58, y + 11);
    doc.fillColor(ink).font("Helvetica-Bold").fontSize(9).text(item.description, 79, y + 9, { width: 250 });
    doc.font("Helvetica").fontSize(8).text(String(item.quantity), 353, y + 11, { width: 38, align: "right" }).text(currency(item.rate).replace("INR ", ""), 401, y + 11, { width: 58, align: "right" }).text(currency(item.amount).replace("INR ", ""), 469, y + 11, { width: 68, align: "right" });
    doc.moveTo(left, y + rowHeight).lineTo(right, y + rowHeight).strokeColor(line).stroke(); y += rowHeight;
  });
  if (!items.length) { doc.fillColor(muted).font("Helvetica").fontSize(9).text("No invoice items", 58, y + 12); y += 38; }

  y += 14;
  const summaryX = 337, summaryW = 210;
  doc.font("Helvetica").fontSize(9).fillColor(muted).text("Subtotal", summaryX, y, { width: 90 }).fillColor(ink).text(currency(invoice.subtotal), summaryX + 90, y, { width: 120, align: "right" }); y += 21;
  if (invoice.gstAmount > 0 || invoice.gstPercent > 0) { doc.fillColor(muted).text(`GST${invoice.gstPercent > 0 ? ` (${invoice.gstPercent}%)` : ""}`, summaryX, y, { width: 90 }).fillColor(ink).text(currency(invoice.gstAmount), summaryX + 90, y, { width: 120, align: "right" }); y += 23; }
  doc.roundedRect(summaryX, y, summaryW, 52, 7).fill(green);
  doc.fillColor("#CDE7D8").font("Helvetica-Bold").fontSize(8).text("GRAND TOTAL", summaryX + 14, y + 11);
  doc.fillColor("#FFFFFF").fontSize(16).text(currency(invoice.amount), summaryX + 14, y + 26, { width: summaryW - 28, align: "right" });

  const notesY = Math.max(y + 76, 620);
  if (invoice.notes) { doc.fillColor(ink).font("Helvetica-Bold").fontSize(9).text("Notes & payment terms", left, notesY); doc.font("Helvetica").fillColor(muted).fontSize(8).text(invoice.notes, left, notesY + 14, { width: 260 }); }
  if (company.companyBankDetails) { doc.fillColor(ink).font("Helvetica-Bold").fontSize(9).text("Payment details", summaryX, notesY); doc.font("Helvetica").fillColor(muted).fontSize(8).text(company.companyBankDetails, summaryX, notesY + 14, { width: summaryW }); }
  doc.moveTo(left, 770).lineTo(right, 770).strokeColor(line).stroke();
  doc.fillColor(muted).font("Helvetica").fontSize(8).text(company.companyInvoiceFooter, left, 783, { width, align: "center" });
  doc.end();
  return finished;
}
