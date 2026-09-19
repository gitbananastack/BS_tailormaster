export function GET() {
  return Response.json({ status: "ok", service: "stitchflow", timestamp: new Date().toISOString() });
}
