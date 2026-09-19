import { currentAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!await currentAdmin()) return Response.json({ error: "Administrator access required." }, { status: 403 });
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const databaseLatencyMs = Date.now() - started;
    const [users, customers, orders, assignments, statusUpdates, managerNotes, laborCosts] = await Promise.all([
      prisma.user.count(), prisma.customer.count(), prisma.order.count(), prisma.orderAssignment.count(), prisma.orderStatusUpdate.count(), prisma.orderManagerNote.count(), prisma.laborCostEntry.count(),
    ]);
    return Response.json({ checkedAt: new Date().toISOString(), application: { status: "healthy", runtime: process.version, environment: process.env.NODE_ENV || "development" }, database: { status: "connected", latencyMs: databaseLatencyMs, provider: "MySQL" }, records: { users, customers, orders, assignments, statusUpdates, managerNotes, laborCosts } });
  } catch {
    return Response.json({ checkedAt: new Date().toISOString(), application: { status: "degraded", runtime: process.version, environment: process.env.NODE_ENV || "development" }, database: { status: "unavailable", provider: "MySQL" }, records: null }, { status: 503 });
  }
}
