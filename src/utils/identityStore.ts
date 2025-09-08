import { create } from "zustand";
import * as bip39 from "bip39";
import { deriveFromMnemonic } from "@/utils/did";

export type Role = "admin" | "company" | "creator" | "operator" | "machine";

export type Actor = {
  did: string;
  role: Role;
  name: string;
  publicKeyBase64: string;
  companyDid?: string; // per attori interni
};

type Caller = { did: string; role: Role };

type State = {
  actors: Record<string, Actor>;
  loaded: boolean;
  load: () => void;
  save: () => void;

  list: () => Actor[];
  get: (did: string) => Actor | undefined;
  listCompanies: () => Actor[];
  listByCompany: (companyDid: string) => Actor[];

  // Admin crea Azienda
  createCompany: (caller: Caller, params: { name: string; words?: 12 | 24; mnemonic?: string }) =>
    Promise<{ actor: Actor; mnemonic: string }>;

  // Azienda (o Admin) crea attore interno
  createInternalActor: (
    caller: Caller,
    params: { name: string; role: Exclude<Role, "admin" | "company">; companyDid: string; words?: 12 | 24; mnemonic?: string }
  ) => Promise<{ actor: Actor; mnemonic: string }>;

  removeActor: (caller: Caller, did: string) => void;

  // opzionale: bootstrap primo Admin se registro vuoto
  bootstrapAdminIfEmpty: () => Promise<{ actor: Actor; mnemonic: string } | null>;
};

const STORAGE_KEY = "identity:actors";

export const useIdentity = create<State>((set, get) => ({
  actors: {},
  loaded: false,

  load: () => {
    if (get().loaded) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, Actor>) : {};
      set({ actors: parsed, loaded: true });
    } catch {
      set({ actors: {}, loaded: true });
    }
  },
  save: () => localStorage.setItem(STORAGE_KEY, JSON.stringify(get().actors)),

  list: () => Object.values(get().actors),
  get: (did) => get().actors[did],
  listCompanies: () => Object.values(get().actors).filter((a) => a.role === "company"),
  listByCompany: (companyDid) => Object.values(get().actors).filter((a) => a.companyDid === companyDid),

  createCompany: async (caller, { name, words = 24, mnemonic }) => {
    if (caller.role !== "admin") throw new Error("Solo Admin può creare aziende."); // :contentReference[oaicite:6]{index=6}
    const m = mnemonic ?? bip39.generateMnemonic(words === 24 ? 256 : 128);
    const { did, keyPair } = await deriveFromMnemonic(m);
    const actor: Actor = {
      did,
      role: "company",
      name,
      publicKeyBase64: Buffer.from(keyPair.publicKey).toString("base64"),
    };
    const next = { ...get().actors, [did]: actor };
    set({ actors: next }); get().save();
    return { actor, mnemonic: m };
  },

  createInternalActor: async (caller, { name, role, companyDid, words = 24, mnemonic }) => {
    const company = get().actors[companyDid];
    if (!company || company.role !== "company") throw new Error("Azienda non valida.");
    const canCreate = caller.role === "admin" || (caller.role === "company" && caller.did === companyDid);
    if (!canCreate) throw new Error("Non autorizzato a creare attori per questa azienda."); // :contentReference[oaicite:7]{index=7}

    const m = mnemonic ?? bip39.generateMnemonic(words === 24 ? 256 : 128);
    const { did, keyPair } = await deriveFromMnemonic(m);
    const actor: Actor = {
      did,
      role,
      name,
      companyDid,
      publicKeyBase64: Buffer.from(keyPair.publicKey).toString("base64"),
    };
    const next = { ...get().actors, [did]: actor };
    set({ actors: next }); get().save();
    return { actor, mnemonic: m };
  },

  removeActor: (caller, did) => {
    const a = get().actors[did];
    if (!a) return;
    const canRemove =
      caller.role === "admin" ||
      (caller.role === "company" && a.companyDid && caller.did === a.companyDid);
    if (!canRemove) throw new Error("Non autorizzato a rimuovere questo attore.");
    const copy = { ...get().actors }; delete copy[did];
    set({ actors: copy }); get().save();
  },

  bootstrapAdminIfEmpty: async () => {
    get().load();
    if (Object.keys(get().actors).length > 0) return null;
    const m = bip39.generateMnemonic(256);
    const { did, keyPair } = await deriveFromMnemonic(m);
    const admin: Actor = {
      did, role: "admin", name: "ADMIN",
      publicKeyBase64: Buffer.from(keyPair.publicKey).toString("base64"),
    };
    set({ actors: { [did]: admin } }); get().save();
    return { actor: admin, mnemonic: m };
  },
}));
