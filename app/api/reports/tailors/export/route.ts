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
  const entries = await prisma.laborCostEntry.findMany({ where: { stage: "STITCHING", createdAt: dateWhere(range) }, include: { user: { select: { name: true } }, order: { select: { orderNumber: true, garmentName: true, customer: { select: { name: true } }, items: { select: { designCode: true } } } } }, orderBy: { createdAt: "desc" } });
  const workbook = new ExcelJS.Workbook();
  const sheet = prepareSheet(workbook, "Tailor billing", range.label, [{ header: "Date", key: "date", width: 14 }, { header: "Tailor", key: "tailor", width: 24 }, { header: "Order", key: "order", width: 20 }, { header: "Design number", key: "design", width: 25 }, { header: "Client", key: "client", width: 24 }, { header: "Garment", key: "garment", width: 22 }, { header: "Amount", key: "amount", width: 17 }, { header: "Billing status", key: "status", width: 20 }, { header: "Note", key: "note", width: 34 }]);
  entries.forEach(entry => sheet.addRow({ date: entry.createdAt, tailor: entry.user.name, order: entry.order.orderNumber, design: entry.order.items.map(item => item.designCode).filter(Boolean).join(" · "), client: entry.order.customer.name, garment: entry.order.garmentName, amount: Number(entry.amount), status: entry.isAccepted ? "Accepted" : "Pending acceptance", note: entry.responseNote || entry.note || "" }));
  sheet.getColumn("date").numFmt = "dd-mmm-yyyy";
  sheet.getColumn("amount").numFmt = '₹#,##0.00';
  finishRows(sheet);
  return workbookResponse(workbook, `stitchflow-tailor-billing-${range.from.toISOString().slice(0, 10)}-${new Date(range.to.getTime() - 1).toISOString().slice(0, 10)}.xlsx`);
}
