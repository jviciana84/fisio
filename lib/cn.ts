export function cn(
  ...parts: (string | boolean | undefined | null)[]
): string {
  return parts.filter(Boolean).join(" ");
}
