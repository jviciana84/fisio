import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/sessions";

const sessionCookieName = "staff_session";

export async function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_CHALLENGE_SECRET;
  const token = request.cookies.get(sessionCookieName)?.value;
  // Si falta configuración o no hay token, no rompemos la ruta:
  // dejamos que el guard real del layout (Server) decida.
  if (!secret || !token) {
    return NextResponse.next();
  }

  try {
    await verifySessionToken(token, secret);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

// Next.js middleware espera una exportación llamada `middleware`.
// Se añade para asegurar que en Vercel se ejecute el chequeo correctamente.
export async function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
