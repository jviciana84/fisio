import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/sessions";
import type { StaffSessionPayload } from "@/lib/sessions";

export async function getStaffSession(): Promise<StaffSessionPayload | null> {
  const secret = process.env.AUTH_CHALLENGE_SECRET;
  if (!secret) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get("staff_session")?.value;
  if (!token) return null;

  try {
    const payload = await verifySessionToken<StaffSessionPayload>(token, secret);
    if (!payload.userId || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}
