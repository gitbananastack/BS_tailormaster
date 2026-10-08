export function appBaseUrl(requestHeaders: { get(name: string): string | null }) {
  const configured = process.env.APP_URL?.trim().replace(/\/$/, "");
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host") || "localhost:3000";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || (process.env.NODE_ENV === "production" ? "https" : "http");
  const requestOrigin = `${protocol}://${host}`;
  if (!configured) return requestOrigin;
  if (process.env.NODE_ENV === "production" && isPrivateOrigin(configured) && !isPrivateOrigin(requestOrigin)) return requestOrigin;
  return configured;
}

function isPrivateOrigin(origin: string) {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.startsWith("10.") || hostname.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  } catch {
    return false;
  }
}
