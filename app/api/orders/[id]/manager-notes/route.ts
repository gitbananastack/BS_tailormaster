import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ stage: z.enum(["CUTTING", "STITCHING", "QUALITY_CHECK", "PACKING", "DELIVERY"]), message: z.string().trim().min(1, "Enter a note.").max(2000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return Response.json({ error: "Sign in to add a note." }, { status: 401 });
  if (!["ADMIN", "ORDER_MANAGER"].includes(actor.role)) return Response.json({ error: "Only Admin or Order Manager can send worker instructions." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Invalid note." }, { status: 400 });
  const { id } = await params;
  const exists = await prisma.order.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return Response.json({ error: "Job order not found." }, { status: 404 });
  const note = await prisma.orderManagerNote.create({ data: { orderId: id, stage: parsed.data.stage, message: parsed.data.message, authorId: actor.id }, include: { author: { select: { name: true } } } });
  return Response.json({ ...note, createdAt: note.createdAt.toISOString() }, { status: 201 });
}
