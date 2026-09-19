import { currentAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function POST() {
  if (!await currentAdmin()) return Response.json({ error: "Administrator access required." }, { status: 403 });
  try {
    await prisma.$disconnect();
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ message: "Database connection restored successfully." });
  } catch {
    return Response.json({ error: "Database reconnection failed. Check MySQL service and credentials." }, { status: 503 });
  }
}
