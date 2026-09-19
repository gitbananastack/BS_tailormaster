import { createHmac, timingSafeEqual } from "crypto";

const cookieName = "stitchflow_session";

export function createSessionValue(userId: string) {
  const expiry = Math.floor(Date.now() / 1000) + 60 * 60 * 12;
  const payload = `${userId}.${expiry}`;
  const signature = createHmac("sha256", process.env.AUTH_SECRET || "development-only-secret").update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function sessionCookieName() { return cookieName; }

export function isValidSession(value?: string) {
  if (!value) return false;
  const [userId, expiryText, signature] = value.split(".");
  if (!userId || !expiryText || !signature || Number(expiryText) < Date.now() / 1000) return false;
  const payload = `${userId}.${expiryText}`;
  const expected = createHmac("sha256", process.env.AUTH_SECRET || "development-only-secret").update(payload).digest("base64url");
  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

export function sessionUserId(value?: string) {
  if (!isValidSession(value)) return null;
  return value!.split(".")[0];
}
