import { NextResponse, type NextRequest } from "next/server";
import { appBaseUrl } from "./lib/app-url";

export function middleware(request: NextRequest) {
  if (request.cookies.has("stitchflow_session")) return NextResponse.next();
  // Next.js middleware requires an absolute redirect, using the public origin.
  const login = new URL("/login", appBaseUrl(request.headers));
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/", "/orders/:path*", "/admin/:path*", "/scan", "/my-work"] };
