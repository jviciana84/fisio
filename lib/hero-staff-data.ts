export type HeroStaffMember = {
  /** UUID de `staff_access` (estable para keys de React). */
  id: string
  name: string
  specialty: string
  bio: string
  /** URL en Storage; si falta, avatar generado. */
  avatarUrl?: string | null
}

export function staffAvatarSrc(seed: string) {
  const q = encodeURIComponent(seed)
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${q}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
}

export function heroStaffAvatarSrc(member: HeroStaffMember): string {
  const u = member.avatarUrl?.trim()
  if (u) return u
  return staffAvatarSrc(member.name)
}
