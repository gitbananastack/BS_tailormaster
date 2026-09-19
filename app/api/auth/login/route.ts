import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSessionValue, sessionCookieName } from "@/lib/session";
import { z } from "zod";

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Enter your username and password." }, { status: 400 });
  const user = await prisma.user.findFirst({ where: { email: parsed.data.username, isActive: true } });
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) return Response.json({ error: "Invalid username or password." }, { status: 401 });

  const response = Response.json({ name: user.name, role: user.role });
  response.headers.append("Set-Cookie", `${sessionCookieName()}=${createSessionValue(user.id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`);
  return response;
}
