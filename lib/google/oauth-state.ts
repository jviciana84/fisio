import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

export type GoogleOAuthStatePayload = {
  purpose: "google_calendar_oauth";
  userId: string;
};

export async function signGoogleOAuthState(
  payload: GoogleOAuthStatePayload,
  secret: string,
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(encoder.encode(secret));
}

export async function verifyGoogleOAuthState(
  token: string,
  secret: string,
): Promise<GoogleOAuthStatePayload> {
  const { payload } = await jwtVerify(token, encoder.encode(secret), {
    algorithms: ["HS256"],
  });
  if (payload.purpose !== "google_calendar_oauth" || typeof payload.userId !== "string") {
    throw new Error("Estado OAuth inválido");
  }
  return { purpose: "google_calendar_oauth", userId: payload.userId };
}
