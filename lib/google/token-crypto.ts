import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const KEY_LEN = 32;

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, "fisio-google-cal-v1", KEY_LEN);
}

/** Formato: iv.cipher.tag (base64url) */
export function encryptSecret(plain: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, enc, tag].map((b) => b.toString("base64url")).join(".");
}

export function decryptSecret(payload: string, secret: string): string {
  const parts = payload.split(".");
  if (parts.length !== 3) {
    throw new Error("Token cifrado inválido");
  }
  const [ivB64, encB64, tagB64] = parts;
  const key = deriveKey(secret);
  const iv = Buffer.from(ivB64!, "base64url");
  const enc = Buffer.from(encB64!, "base64url");
  const tag = Buffer.from(tagB64!, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function getGoogleTokenSecret(): string | null {
  const s =
    process.env.GOOGLE_OAUTH_TOKEN_SECRET?.trim() ||
    process.env.AUTH_CHALLENGE_SECRET?.trim();
  return s || null;
}
