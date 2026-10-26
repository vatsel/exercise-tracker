import { NextResponse, type NextRequest } from "next/server";
import { isValidSession, sessionCookie } from "@/lib/session";

// Sends every request without a valid session to the login page.
export function proxy(request: NextRequest) {
  const token = request.cookies.get(sessionCookie)?.value;
  if (isValidSession(token)) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Everything except the login page itself and the files every page loads.
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
