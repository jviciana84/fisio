/** Añade un bloque de historial sin borrar notas previas (intentos repetidos, reservas, etc.). */
export function mergeClientNotesBlock(prev: string | null | undefined, block: string): string {
  const p = prev?.trim();
  const b = block.trim();
  if (!p) return b;
  return `${p}\n\n---\n\n${b}`;
}
