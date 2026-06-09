import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "srs_helpdesk_session";

async function getProxySession(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(
      process.env.AUTH_SECRET ||
        process.env.NEXTAUTH_SECRET ||
        "dev-helpdesk-secret",
    );
    const verified = await jwtVerify(token, secret);
    return verified.payload as {
      id?: string;
      role?: string;
      email?: string;
      name?: string;
    };
  } catch {
    return null;
  }
}

export default async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const session = await getProxySession(req);
  const hasSession = Boolean(session?.id);
  const authPages = [
    "/login",
    "/forgot-password",
    "/reset-password",
    "/set-password",
  ];

  if (pathname.startsWith("/dashboard") && !hasSession) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", `${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (authPages.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith("/dashboard/admin") && session?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/not-authorized", req.url));
  }

  if (pathname === "/set-password" && !searchParams.get("token")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
