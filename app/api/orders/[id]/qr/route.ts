import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";
import { appBaseUrl } from "@/lib/app-url";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token");
  const actor = await currentUser();
  const order = await prisma.order.findUnique({ where: { id }, select: { id: true, orderNumber: true, qrToken: true } });
  if (!order || (!actor && (!token || token !== order.qrToken))) return Response.json({ error: "QR label not available." }, { status: 403 });
  const trackingUrl = `${appBaseUrl(request.headers)}/track/${encodeURIComponent(order.qrToken || order.orderNumber)}`;
  const png = await QRCode.toBuffer(trackingUrl, { width: 560, margin: 1, errorCorrectionLevel: "M", color: { dark: "#143b2d", light: "#fffefa" } });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="${order.orderNumber}-qr.png"`, "Cache-Control": "private, max-age=3600" } });
}
