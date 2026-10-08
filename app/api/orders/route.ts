import { hasAnyRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/current-user";
import { orderSchema } from "@/lib/order-validation";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  const actor = await currentUser();
  if (!actor) return Response.json({ error: "Sign in to create an order." }, { status: 401 });
  if (!hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"])) return Response.json({ error: "Only an administrator or order manager can create an order." }, { status: 403 });
  const parsed = orderSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Invalid order information", details: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  try {
    const existingCustomer = await prisma.customer.findFirst({ where: { name: data.customer.name } });
    const customer = existingCustomer
      ? await prisma.customer.update({ where: { id: existingCustomer.id }, data: { phone: data.customer.phone || null, address: data.customer.address || null } })
      : await prisma.customer.create({ data: { name: data.customer.name, phone: data.customer.phone || null, address: data.customer.address || null } });
    const order = await prisma.order.create({
      data: {
        orderNumber: data.orderNumber,
        createdById: actor.id,
        customerId: customer.id,
        garmentName: data.garmentName,
        issueNumber: data.issueNumber || null,
        processName: data.processName,
        salesOrderNumber: data.salesOrderNumber || null,
        productionManager: data.productionManager || actor.name,
        receivedDate: data.receivedDate ? new Date(data.receivedDate) : null,
        inwardValue: data.inwardValue ?? null,
        qrToken: `ORDER-${data.orderNumber}-${randomUUID()}`,
        items: { create: data.items.map(item => ({ itemName: item.itemName, designCode: item.designCode, color: item.color || null, clientOrderReference: item.clientOrderReference || null, sizeQuantities: { create: item.sizeQuantities } })) },
        rawMaterials: { create: data.rawMaterials.map((material) => ({ ...material, itemCode: material.itemCode || null, color: material.color || null, panna: material.panna ?? null })) },
      },
      include: { items: { include: { sizeQuantities: true } }, rawMaterials: true },
    });
    return Response.json(order, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return Response.json({ error: "This job-order number already exists." }, { status: 409 });
    return Response.json({ error: "Unable to save the order." }, { status: 500 });
  }
}
