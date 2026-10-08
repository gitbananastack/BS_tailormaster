import { primaryRole } from "@/lib/roles";
import { currentAdmin } from "@/lib/current-user";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const roles = ["ADMIN", "ORDER_MANAGER", "CUTTING_OPERATOR", "FUSING_OPERATOR", "TAILOR", "QC_INSPECTOR", "PACKING_STAFF", "DELIVERY_COORDINATOR"] as const;
const screens = ["PRODUCTIVITY"] as const;
const createUserSchema = z.object({ name: z.string().min(2), username: z.string().min(3).max(191), phone: z.string().trim().min(7).max(30).optional().or(z.literal("")), password: z.string().min(8), role: z.enum(roles).optional(), roles: z.array(z.enum(roles)).min(1).max(8).optional(), screenAccess: z.array(z.enum(screens)).max(1).optional() }).refine(data => data.roles !== undefined || data.role !== undefined);

export async function GET() {
  if (!await currentAdmin()) return Response.json({ error: "Administrator access required." }, { status: 403 });
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, phone: true, role: true, roles: true, screenAccess: true, isActive: true, createdAt: true }, orderBy: { createdAt: "desc" } });
  return Response.json(users);
}

export async function POST(request: Request) {
  if (!await currentAdmin()) return Response.json({ error: "Administrator access required." }, { status: 403 });
  const parsed = createUserSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Enter a name, unique username, password of at least 8 characters, and role." }, { status: 400 });
  try {
    const user = await prisma.user.create({ data: { name: parsed.data.name, email: parsed.data.username, phone: parsed.data.phone || null, passwordHash: hashPassword(parsed.data.password), role: primaryRole(parsed.data.roles || [parsed.data.role!]), roles: [...new Set(parsed.data.roles || [parsed.data.role!])], screenAccess: parsed.data.screenAccess || [] }, select: { id: true, name: true, email: true, phone: true, role: true, roles: true, screenAccess: true, isActive: true, createdAt: true } });
    return Response.json(user, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return Response.json({ error: "This username is already in use." }, { status: 409 });
    return Response.json({ error: "Unable to create user." }, { status: 500 });
  }
}
