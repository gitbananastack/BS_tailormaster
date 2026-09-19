import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (request.cookies.has("stitchflow_session")) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = { matcher: ["/", "/orders/:path*", "/admin/:path*", "/scan", "/my-work"] };
