import { env } from "@/lib/env";

const BUCKET = "staff-public";

/** URL pública del avatar si existe `public_avatar_path` en `staff_access`. */
export function getStaffPublicAvatarUrl(path: string | null | undefined): string | null {
  const p = path?.trim();
  if (!p) return null;
  const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  if (!base) return null;
  const encoded = p
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${base}/storage/v1/object/public/${BUCKET}/${encoded}`;
}
