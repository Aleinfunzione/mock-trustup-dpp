// src/types/vc.ts
export type VCSubjectType = "organization" | "process" | "product";
export type VCStatus = "valid" | "revoked" | "expired" | "superseded";

export type VCHashProof = {
  type: "MockJWS";
  jws: string; // sha256(canonicalize(vcWithoutProofAndEventHistory))
};

export type VCBilling = {
  amount: number;
  payerType?: string;
  txRef?: string;
};

export type VCBase<TData = any> = {
  id: string;
  type: string[]; // e.g. ["VerifiableCredential","OrganizationVC"]
  version: number;
  issuerDid: string;
  subjectType: VCSubjectType;
  subjectId: string;
  schemaId: string;
  data: TData & { billing?: VCBilling };
  status: VCStatus;
  revokedAt?: string;
  reason?: string;
  supersedes?: string;     // id VC precedente
  supersededBy?: string;   // id VC successiva
  eventHistory: Array<{
    ts: string;
    type: "create" | "revoke" | "supersede" | "note";
    note?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  proof: VCHashProof;
};

export type VC<T = any> = VCBase<T>;

export type OrganizationVCData = {
  certificationNumber: string;
  issuingBody: string;
  validFrom: string;  // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  scopeStatement?: string;
  evidenceLink?: string;
};

export type ProcessVCData = {
  processId: string;
  islandId?: string;
  site?: string;
  standard?: string;
  certificateId?: string;
  validFrom?: string;
  validUntil?: string;
};

export type ProductVCData = {
  gtin: string;
  lot?: string;
  attributes?: Record<string, unknown>;
  testResults?: Record<string, unknown>;
};

export type ListVCFilter = {
  subjectType?: VCSubjectType;
  subjectId?: string;
  schemaId?: string;
  status?: VCStatus;
};

export type IntegrityResult = {
  valid: boolean;
  expectedHash: string;
  actualHash: string;
};

export type CreateOrganizationVCInput = {
  schemaId: string;
  issuerDid: string;
  subjectId: string;
  data: OrganizationVCData;
};

export type CreateProcessVCInput = {
  schemaId: string;
  issuerDid: string;
  subjectId: string; // processId
  data: ProcessVCData;
};

export type CreateProductVCInput = {
  schemaId: string;
  issuerDid: string;
  subjectId: string; // productId or gtin+lot
  data: ProductVCData;
};
