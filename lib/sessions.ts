import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

export type StaffSessionPayload = {
  userId: string;
  role: string;
  /** Presente solo en la cookie temporal de primer acceso TOTP (admin). */
  purpose?: "totp_onboarding";
};

export async function signSessionToken(
  payload: StaffSessionPayload,
  secret: string,
  expiresIn: string,
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encoder.encode(secret));
}

export async function verifySessionToken<T extends object>(
  token: string,
  secret: string,
) {
  const { payload } = await jwtVerify(token, encoder.encode(secret), {
    algorithms: ["HS256"],
  });

  return payload as T;
}
