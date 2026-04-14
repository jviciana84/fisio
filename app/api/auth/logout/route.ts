import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const sessionCookieName = "staff_session";
const challengeCookieName = "pin_challenge";
const onboardingCookieName = "totp_onboarding";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
  cookieStore.delete(challengeCookieName);
  cookieStore.delete(onboardingCookieName);

  return NextResponse.json({ ok: true });
}
