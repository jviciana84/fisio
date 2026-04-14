import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/sessions";
import type { StaffSessionPayload } from "@/lib/sessions";
import { NextResponse } from "next/server";

export async function requireAdminApi(): Promise<
  StaffSessionPayload | NextResponse
> {
  const secret = process.env.AUTH_CHALLENGE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, message: "Configuración incompleta de autenticación" },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("staff_session")?.value;
  if (!token) {
    return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 401 });
  }

  try {
    const payload = await verifySessionToken<StaffSessionPayload>(token, secret);
    if (payload.role !== "admin") {
      return NextResponse.json({ ok: false, message: "Solo administradores" }, { status: 403 });
    }
    return payload;
  } catch {
    return NextResponse.json({ ok: false, message: "Sesión inválida" }, { status: 401 });
  }
}
