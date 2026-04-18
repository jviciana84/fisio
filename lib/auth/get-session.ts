import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/sessions";
import type { StaffSessionPayload } from "@/lib/sessions";

export type StaffSessionInfo = StaffSessionPayload & {
  /** `iat` del JWT: inicio de sesión (emisión del token). */
  issuedAt: Date | null;
};

export async function getStaffSession(): Promise<StaffSessionInfo | null> {
  const secret = process.env.AUTH_CHALLENGE_SECRET;
  if (!secret) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get("staff_session")?.value;
  if (!token) return null;

  try {
    const payload = await verifySessionToken<StaffSessionPayload & { iat?: number }>(token, secret);
    if (!payload.userId || !payload.role) return null;
    const issuedAt =
      typeof payload.iat === "number" && Number.isFinite(payload.iat)
        ? new Date(payload.iat * 1000)
        : null;
    return {
      userId: payload.userId,
      role: payload.role,
      purpose: payload.purpose,
      issuedAt,
    };
  } catch {
    return null;
  }
}
