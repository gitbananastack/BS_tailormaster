import { prisma } from "@/lib/prisma";
import { sessionCookieName, sessionUserId } from "@/lib/session";
import { cookies } from "next/headers";

export async function currentUser() {
  const cookieStore = await cookies();
  const id = sessionUserId(cookieStore.get(sessionCookieName())?.value);
  if (!id) return null;
  return prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, isActive: true } });
}

export async function currentAdmin() {
  const user = await currentUser();
  return user?.isActive && user.role === "ADMIN" ? user : null;
}
