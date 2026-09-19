import { sessionCookieName } from "@/lib/session";

export async function POST() {
  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", `${sessionCookieName()}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return response;
}
