import type { HeroStaffMember } from "@/lib/hero-staff-data";
import { getStaffPublicAvatarUrl } from "@/lib/staff-public-avatar-url";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const DEFAULT_SPECIALTY = "Fisioterapia";
const DEFAULT_BIO =
  "Profesional de nuestro equipo. Consulta en recepción para más información sobre su enfoque.";

function mapRow(row: {
  id: string;
  full_name: string;
  public_specialty: string | null;
  public_bio: string | null;
  public_avatar_path: string | null;
}): HeroStaffMember {
  const specialty = row.public_specialty?.trim();
  const bio = row.public_bio?.trim();
  return {
    id: row.id,
    name: row.full_name.trim(),
    specialty: specialty || DEFAULT_SPECIALTY,
    bio: bio || DEFAULT_BIO,
    avatarUrl: getStaffPublicAvatarUrl(row.public_avatar_path),
  };
}

/** Staff activo con perfil público para el hero de la landing (server-only). */
export async function fetchPublicHeroStaff(): Promise<HeroStaffMember[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("staff_access")
      .select("id, full_name, public_specialty, public_bio, public_avatar_path")
      .eq("is_active", true)
      .eq("public_profile", true)
      .order("full_name", { ascending: true });

    if (error || !data?.length) {
      return [];
    }

    return data.map((row) =>
      mapRow(
        row as {
          id: string;
          full_name: string;
          public_specialty: string | null;
          public_bio: string | null;
          public_avatar_path: string | null;
        },
      ),
    );
  } catch {
    return [];
  }
}
