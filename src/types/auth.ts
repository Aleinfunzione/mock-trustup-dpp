export type Role = "admin" | "company" | "creator" | "operator" | "machine";

export interface User {
  did: string;
  role: Role;
  username?: string;      // solo per admin username/password
  companyDid?: string;    // opzionale: relazione aziendale
  publicKey?: string;     // mock: chiave pubblica derivata
}
