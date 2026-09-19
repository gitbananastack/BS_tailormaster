import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!await currentUser()) return Response.json({ error: "Sign in to scan orders." }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const token = searchParams.get("token");
  if (!id && !token) return Response.json({ error: "QR value is required." }, { status: 400 });
  const order = await prisma.order.findFirst({ where: id ? { id } : { OR: [{ qrToken: token! }, { orderNumber: token! }] }, select: { id: true, orderNumber: true, garmentName: true, status: true } });
  if (!order) return Response.json({ error: "No job order was found for this QR code." }, { status: 404 });
  return Response.json(order);
}
