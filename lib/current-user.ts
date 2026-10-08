import { hasRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { sessionCookieName, sessionUserId } from "@/lib/session";
import { cookies } from "next/headers";

export async function currentUser() {
  const cookieStore = await cookies();
  const id = sessionUserId(cookieStore.get(sessionCookieName())?.value);
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, phone: true, role: true, roles: true, screenAccess: true, isActive: true } });
  return user?.isActive ? user : null;
}

export async function currentAdmin() {
  const user = await currentUser();
  return user?.isActive && hasRole(user, "ADMIN") ? user : null;
}
