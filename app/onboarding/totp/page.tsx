import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { generateURI } from "otplib";
import { env } from "@/lib/env";
import { verifySessionToken } from "@/lib/sessions";
import type { StaffSessionPayload } from "@/lib/sessions";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { OnboardingTotpForm } from "./onboarding-form";

const onboardingCookieName = "totp_onboarding";

export default async function OnboardingTotpPage() {
  const secret = env.AUTH_CHALLENGE_SECRET;
  if (!secret) redirect("/login");

  const cookieStore = await cookies();
  const token = cookieStore.get(onboardingCookieName)?.value;
  if (!token) redirect("/login");

  let payload: StaffSessionPayload & { purpose?: string };
  try {
    payload = await verifySessionToken<StaffSessionPayload & { purpose?: string }>(
      token,
      secret,
    );
  } catch {
    redirect("/login");
  }

  if (payload.purpose !== "totp_onboarding") {
    redirect("/login");
  }

  const supabase = createSupabaseAdminClient();
  const { data: row, error } = await supabase
    .from("staff_access")
    .select("full_name, email, totp_secret, totp_onboarding_complete")
    .eq("id", payload.userId)
    .maybeSingle();

  if (error || !row?.totp_secret) {
    redirect("/login");
  }

  if (row.totp_onboarding_complete) {
    redirect("/dashboard");
  }

  const issuer = process.env.TOTP_ISSUER ?? "Fisioterapia Roc Blanc";
  const label = row.full_name || row.email || "Usuario";
  const otpauthUri = generateURI({
    issuer,
    label,
    secret: row.totp_secret,
  });

  const qrDataUrl = await QRCode.toDataURL(otpauthUri, {
    width: 280,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <h1 className="text-center text-xl font-semibold text-slate-900">
          Configura Google Authenticator
        </h1>
        <p className="mt-3 text-center text-sm text-slate-600">
          Es tu primer acceso como administrador. Escanea el código QR con la app{" "}
          <strong>Google Authenticator</strong> (Añadir cuenta → Escanear código QR).
        </p>
        <p className="mt-2 text-center text-sm text-slate-600">
          Después introduce el código de 6 dígitos para confirmar que todo está bien.
        </p>

        <div className="mt-8 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="Código QR para Google Authenticator"
            width={280}
            height={280}
            className="rounded-xl border border-slate-100"
          />
        </div>

        <OnboardingTotpForm />
      </div>
    </main>
  );
}
