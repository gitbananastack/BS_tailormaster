import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (request.cookies.has("stitchflow_session")) return NextResponse.next();
  const query = new URLSearchParams({ next: request.nextUrl.pathname });
  // Keep the browser on its public origin behind a reverse proxy.
  return new NextResponse(null, {
    status: 307,
    headers: { Location: `/login?${query.toString()}` },
  });
}

export const config = { matcher: ["/", "/orders/:path*", "/admin/:path*", "/scan", "/my-work"] };
