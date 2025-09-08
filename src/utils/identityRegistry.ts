export type Role = "admin" | "company" | "creator" | "operator" | "machine";
export type Actor = { did: string; role: Role; name: string; publicKeyBase64: string; companyDid?: string };

const actors = new Map<string, Actor>();

export const identityRegistry = {
  register(a: Actor) { actors.set(a.did, a); },
  get(did: string) { return actors.get(did); },
  getRole(did: string) { return actors.get(did)?.role; },
  all() { return [...actors.values()]; },
};
