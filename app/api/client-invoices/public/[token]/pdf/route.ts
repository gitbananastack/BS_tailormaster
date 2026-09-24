import { getCompanySettings } from "@/lib/company-settings";
import { createInvoicePdf } from "@/lib/invoice-pdf";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoice = await prisma.clientInvoice.findUnique({ where: { shareToken: token }, include: { order: { include: { customer: true, items: { include: { sizeQuantities: true } } } } } });
  if (!invoice || invoice.status === "CANCELLED") return Response.json({ error: "Invoice not found." }, { status: 404 });
  const pdf = await createInvoicePdf({ ...invoice, amount: Number(invoice.amount), subtotal: Number(invoice.subtotal), gstPercent: Number(invoice.gstPercent), gstAmount: Number(invoice.gstAmount) }, await getCompanySettings());
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`, "Cache-Control": "private, no-store" } });
}
