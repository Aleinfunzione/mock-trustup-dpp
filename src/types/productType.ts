/** JSON Schema completo (draft-07+) */
export type JsonSchema = Record<string, any>

export interface ProductType {
  id: string
  name: string
  /** Schema per validare Product.attributes con AJV */
  schema?: JsonSchema
}
