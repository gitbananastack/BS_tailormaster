export function scanQuery(value: string): string {
  const input = value.trim();
  if (!input) throw new Error("Enter a job-order number or scan a QR label.");
  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.id === "string" && parsed.id.trim()) return new URLSearchParams({ id: parsed.id.trim() }).toString();
      const token = parsed.token || parsed.jobOrder;
      if (typeof token === "string" && token.trim()) return new URLSearchParams({ token: token.trim() }).toString();
    }
  } catch { /* Also accept printed URLs and order numbers. */ }
  try {
    const url = new URL(input);
    const track = url.pathname.match(/^\/track\/([^/]+)\/?$/);
    if (track) return new URLSearchParams({ token: decodeURIComponent(track[1]) }).toString();
    const order = url.pathname.match(/^\/orders\/([^/]+)(?:\/(?:status|label))?\/?$/);
    if (order) return new URLSearchParams({ id: decodeURIComponent(order[1]) }).toString();
  } catch { /* Treat non-URL values as job-order numbers. */ }
  return new URLSearchParams({ token: input }).toString();
}
