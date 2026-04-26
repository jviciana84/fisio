import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/sessions";
import type { StaffSessionPayload } from "@/lib/sessions";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

async function fetchActiveRole(userId: string): Promise<"admin" | "staff" | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("staff_access")
    .select("role, is_active")
    .eq("id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;
  return data.role === "admin" ? "admin" : data.role === "staff" ? "staff" : null;
}

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
    const activeRole = await fetchActiveRole(payload.userId);
    if (activeRole !== "admin") {
      return NextResponse.json({ ok: false, message: "Solo administradores" }, { status: 403 });
    }
    return { ...payload, role: activeRole };
  } catch {
    return NextResponse.json({ ok: false, message: "Sesión inválida" }, { status: 401 });
  }
}

/** Sesión de panel (admin o staff): caja (productos, clientes, crear ticket). Gastos y editar/borrar tickets solo admin. */
export async function requireStaffOrAdminApi(): Promise<
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
    const activeRole = await fetchActiveRole(payload.userId);
    if (activeRole !== "admin" && activeRole !== "staff") {
      return NextResponse.json({ ok: false, message: "Sesión no válida" }, { status: 403 });
    }
    return { ...payload, role: activeRole };
  } catch {
    return NextResponse.json({ ok: false, message: "Sesión inválida" }, { status: 401 });
  }
}
