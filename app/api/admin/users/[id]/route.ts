import { primaryRole } from "@/lib/roles";
import { currentAdmin } from "@/lib/current-user";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const roles = ["ADMIN", "ORDER_MANAGER", "CUTTING_OPERATOR", "FUSING_OPERATOR", "TAILOR", "QC_INSPECTOR", "PACKING_STAFF", "DELIVERY_COORDINATOR"] as const;
const screens = ["PRODUCTIVITY"] as const;
const updateSchema = z.object({ isActive: z.boolean().optional(), role: z.enum(roles).optional(), roles: z.array(z.enum(roles)).min(1).max(8).optional(), screenAccess: z.array(z.enum(screens)).max(1).optional(), phone: z.string().trim().min(7).max(30).nullable().optional(), password: z.string().min(8).optional() }).refine((data) => data.isActive !== undefined || data.role !== undefined || data.roles !== undefined || data.screenAccess !== undefined || data.phone !== undefined || data.password !== undefined);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await currentAdmin();
  if (!admin) return Response.json({ error: "Administrator access required." }, { status: 403 });
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid user update." }, { status: 400 });
  const { id } = await params;
  const selectedRoles = parsed.data.roles || (parsed.data.role ? [parsed.data.role] : undefined);
  if (id === admin.id && (parsed.data.isActive === false || (selectedRoles && !selectedRoles.includes("ADMIN")))) return Response.json({ error: "You cannot remove your own administrator access." }, { status: 400 });
  const { password, roles: ignoredRoles, role: ignoredRole, ...userChanges } = parsed.data;
  const user = await prisma.user.update({ where: { id }, data: { ...userChanges, ...(selectedRoles ? { roles: [...new Set(selectedRoles)], role: primaryRole(selectedRoles) } : {}), ...(password ? { passwordHash: hashPassword(password) } : {}) }, select: { id: true, name: true, email: true, phone: true, role: true, roles: true, screenAccess: true, isActive: true, createdAt: true } });
  return Response.json(user);
}
