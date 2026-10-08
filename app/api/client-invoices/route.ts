import { hasAnyRole } from "@/lib/roles";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { z } from "zod";

const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(250),
  quantity: z.coerce.number().positive().max(100000),
  rate: z.coerce.number().min(0).max(100000000),
});
const schema = z.object({
  orderId: z.string().min(1),
  lineItems: z.array(lineItemSchema).min(1).max(100),
  gstPercent: z.coerce.number().min(0).max(100).default(0),
  gstAmount: z.coerce.number().min(0).max(100000000).default(0),
  clientName: z.string().trim().min(1).max(191),
  clientPhone: z.string().trim().max(30).optional(),
  clientAddress: z.string().trim().max(2000).optional(),
  clientGstin: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(4000).optional(),
  dueDate: z.string().optional(),
});

export async function POST(request: Request) {
  const actor = await currentUser();
  if (!actor?.isActive || !hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"])) return Response.json({ error: "Admin or Order Manager access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Add at least one valid billing item with its quantity and rate." }, { status: 400 });
  const order = await prisma.order.findUnique({ where: { id: parsed.data.orderId }, select: { id: true } });
  if (!order) return Response.json({ error: "Job order not found." }, { status: 404 });
  const lineItems = parsed.data.lineItems.map((item) => ({ ...item, amount: Number((item.quantity * item.rate).toFixed(2)) }));
  const subtotal = Number(lineItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
  const gstAmount = Number(parsed.data.gstAmount.toFixed(2));
  const amount = Number((subtotal + gstAmount).toFixed(2));
  if (amount <= 0) return Response.json({ error: "The invoice total must be greater than zero." }, { status: 400 });
  const now = new Date();
  const invoice = await prisma.clientInvoice.create({ data: { invoiceNumber: `INV-${now.getFullYear()}-${String(Date.now()).slice(-8)}`, shareToken: randomUUID(), orderId: order.id, clientName: parsed.data.clientName, clientPhone: parsed.data.clientPhone || null, clientAddress: parsed.data.clientAddress || null, clientGstin: parsed.data.clientGstin?.toUpperCase() || null, lineItems, subtotal, gstPercent: parsed.data.gstPercent, gstAmount, amount, notes: parsed.data.notes || null, dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null, createdById: actor.id }, include: { order: { include: { customer: true } } } });
  return Response.json({ ...invoice, amount: invoice.amount.toString(), subtotal: invoice.subtotal.toString(), gstPercent: invoice.gstPercent.toString(), gstAmount: invoice.gstAmount.toString(), issueDate: invoice.issueDate.toISOString(), dueDate: invoice.dueDate?.toISOString() || null, createdAt: invoice.createdAt.toISOString() });
}
