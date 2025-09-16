import type { Role } from "@/types/auth"

export interface IdentityRecord {
  did: string
  role: Role
  username?: string
  publicKey?: string
  companyDid?: string
}

/** Dati anagrafici azienda (estendibili) */
export interface CompanyDetails {
  vatNumber?: string      // P.IVA
  address?: string        // Indirizzo
  website?: string        // Sito
  email?: string
  phone?: string
}

export interface Company {
  companyDid: string
  name: string
  details?: CompanyDetails
  createdAt: string
}

/**
 * Registry MOCK persistito su localStorage.
 * 'seeds' contiene le seed BIP-39 (12 parole) per gli account creati (solo per demo).
 * In produzione NON andrebbe salvato qui.
 */
export interface IdentityRegistry {
  actors: Record<string, IdentityRecord>   // indicizzato per DID
  companies: Record<string, Company>       // indicizzato per companyDid
  seeds?: Record<string, string>           // DID -> mnemonic (MOCK)
}
