import { currentAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ folder: z.string().trim().min(3).max(180).regex(/^[a-zA-Z0-9_/-]+$/, "Use only letters, numbers, underscore, dash, and slash."), publicUrl: z.string().trim().min(1).max(180).regex(/^\//, "Public URL must begin with /.") });
const defaults = { folder: "public/uploads/qc", publicUrl: "/uploads/qc" };

export async function GET() {
  if (!await currentAdmin()) return Response.json({ error: "Administrator access required." }, { status: 403 });
  const rows = await prisma.appSetting.findMany({ where: { key: { in: ["photoStorageFolder", "photoStoragePublicUrl"] } } });
  const values = new Map(rows.map((row) => [row.key, row.value]));
  return Response.json({ folder: values.get("photoStorageFolder") || defaults.folder, publicUrl: values.get("photoStoragePublicUrl") || defaults.publicUrl });
}

export async function PUT(request: Request) {
  if (!await currentAdmin()) return Response.json({ error: "Administrator access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Invalid storage configuration." }, { status: 400 });
  await prisma.$transaction([prisma.appSetting.upsert({ where: { key: "photoStorageFolder" }, create: { key: "photoStorageFolder", value: parsed.data.folder }, update: { value: parsed.data.folder } }), prisma.appSetting.upsert({ where: { key: "photoStoragePublicUrl" }, create: { key: "photoStoragePublicUrl", value: parsed.data.publicUrl }, update: { value: parsed.data.publicUrl } })]);
  return Response.json(parsed.data);
}
