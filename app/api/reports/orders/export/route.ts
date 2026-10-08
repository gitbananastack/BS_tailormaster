import { currentUser } from "@/lib/current-user";
import { finishRows, prepareSheet, workbookResponse } from "@/lib/excel-report";
import { prisma } from "@/lib/prisma";
import { reportRange, type ReportSearchParams, dateWhere } from "@/lib/reporting";
import { hasAnyRole } from "@/lib/roles";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const actor = await currentUser();
  if (!actor?.isActive || !hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"])) return Response.json({ error: "Admin or Order Manager access required." }, { status: 403 });
  const search = Object.fromEntries(new URL(request.url).searchParams) as ReportSearchParams;
  const range = reportRange(search);
  const orders = await prisma.order.findMany({ where: { createdAt: dateWhere(range) }, include: { customer: { select: { name: true } }, items: { select: { designCode: true, sizeQuantities: { select: { quantity: true } } } }, clientInvoices: { orderBy: { issueDate: "desc" }, take: 1 } }, orderBy: { createdAt: "desc" } });
  const workbook = new ExcelJS.Workbook();
  const sheet = prepareSheet(workbook, "Orders and payments", range.label, [{ header: "Date", key: "date", width: 14 }, { header: "Order", key: "order", width: 20 }, { header: "Design number", key: "design", width: 25 }, { header: "Client", key: "client", width: 24 }, { header: "Garment", key: "garment", width: 22 }, { header: "Pieces", key: "pieces", width: 12 }, { header: "Stage", key: "stage", width: 18 }, { header: "Order status", key: "orderStatus", width: 18 }, { header: "Invoice", key: "invoice", width: 20 }, { header: "Invoice amount", key: "amount", width: 18 }, { header: "Payment status", key: "payment", width: 20 }]);
  orders.forEach(order => { const invoice = order.clientInvoices[0]; sheet.addRow({ date: order.createdAt, order: order.orderNumber, design: order.items.map(item => item.designCode).filter(Boolean).join(" · "), client: order.customer.name, garment: order.garmentName, pieces: order.items.flatMap(item => item.sizeQuantities).reduce((sum, size) => sum + size.quantity, 0), stage: order.currentStage.replaceAll("_", " "), orderStatus: order.status.replaceAll("_", " "), invoice: invoice?.invoiceNumber || "Not billed", amount: invoice ? Number(invoice.amount) : null, payment: invoice?.status.replaceAll("_", " ") || "Not billed" }); });
  sheet.getColumn("date").numFmt = "dd-mmm-yyyy";
  sheet.getColumn("amount").numFmt = '₹#,##0.00';
  finishRows(sheet);
  return workbookResponse(workbook, `stitchflow-orders-${range.from.toISOString().slice(0, 10)}-${new Date(range.to.getTime() - 1).toISOString().slice(0, 10)}.xlsx`);
}
