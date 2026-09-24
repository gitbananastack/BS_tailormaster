import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ status: z.enum(["DRAFT", "ISSUED", "PAID", "CANCELLED"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor?.isActive || !["ADMIN", "ORDER_MANAGER"].includes(actor.role)) {
    return Response.json({ error: "Admin or Order Manager access required." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Choose a valid billing status." }, { status: 400 });
  const { id } = await params;
  const existing = await prisma.clientInvoice.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return Response.json({ error: "Invoice not found." }, { status: 404 });
  const invoice = await prisma.clientInvoice.update({ where: { id }, data: { status: parsed.data.status } });
  return Response.json({ id: invoice.id, status: invoice.status, updatedAt: invoice.updatedAt.toISOString() });
}
