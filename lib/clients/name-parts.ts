function compactSpaces(v: string): string {
  return v.replace(/\s+/g, " ").trim();
}

export function splitSurnameInput(lastNameRaw: string): { lastName1: string; lastName2: string | null } {
  const raw = compactSpaces(lastNameRaw);
  const parts = raw.split(" ").filter(Boolean);
  if (parts.length === 0) return { lastName1: "", lastName2: null };
  if (parts.length === 1) return { lastName1: parts[0], lastName2: null };
  return {
    lastName1: parts[0],
    lastName2: parts.slice(1).join(" "),
  };
}

export function buildFullName(firstNameRaw: string, lastNameRaw: string): string {
  const firstName = compactSpaces(firstNameRaw);
  const { lastName1, lastName2 } = splitSurnameInput(lastNameRaw);
  return compactSpaces([firstName, lastName1, lastName2 ?? ""].join(" "));
}

export function splitLegacyFullName(fullNameRaw: string): { firstName: string; lastName: string } {
  const compact = compactSpaces(fullNameRaw);
  if (!compact) return { firstName: "", lastName: "" };
  const parts = compact.split(" ");
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}
