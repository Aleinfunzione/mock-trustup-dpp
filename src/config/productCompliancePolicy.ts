import type { StandardId } from "@/config/standardsRegistry";

const DEFAULT: StandardId[] = ["GS1"];
const TEXTILE: StandardId[] = ["GS1", "EU_DPP_TEXTILE"];
const ELECTRONICS: StandardId[] = ["GS1", "EU_DPP_ELECTRONICS"];

export function getRequiredStandards(typeId?: string): StandardId[] {
  if (!typeId) return DEFAULT;
  const t = typeId.toLowerCase();
  if (t.includes("textile") || t.includes("apparel")) return TEXTILE;
  if (t.includes("electronic")) return ELECTRONICS;
  return DEFAULT;
}
