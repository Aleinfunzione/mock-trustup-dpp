// src/domains/organization/entities.ts
// Tipi minimi per ambito organizzazione.

export type OrganizationId = string;

export type Organization = {
  id: OrganizationId;
  name?: string;
  did?: string;              // did:example:...
  vatNumber?: string;
};
