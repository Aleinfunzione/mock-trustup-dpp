export function getAdminSeed(): string | undefined {
  const v = (import.meta as any).env?.VITE_ADMIN_SEED as string | undefined;
  if (v && v.trim()) return v.trim();
  const ls = localStorage.getItem("VITE_ADMIN_SEED");
  if (ls && ls.trim()) return ls.trim();
  return undefined;
}

export function getCompanySeed(): string | undefined {
  const v = (import.meta as any).env?.VITE_COMPANY_SEED as string | undefined;
  if (v && v.trim()) return v.trim();
  const ls = localStorage.getItem("VITE_COMPANY_SEED");
  if (ls && ls.trim()) return ls.trim();
  return undefined;
}

export function getCreatorSeed(): string | undefined {
  const v = (import.meta as any).env?.VITE_CREATOR_SEED as string | undefined;
  if (v && v.trim()) return v.trim();
  const ls = localStorage.getItem("VITE_CREATOR_SEED");
  if (ls && ls.trim()) return ls.trim();
  return undefined;
}
