// src/components/products/SchemaAttributesForm.tsx
import * as React from "react";
import Form, { IChangeEvent } from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import type { JsonSchema } from "@/types/productType";

type Props = {
  schema?: JsonSchema | null;
  value: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
  disabled?: boolean;
};

const uiSchema = { "ui:options": { label: true } };

export default function SchemaAttributesForm({ schema, value, onChange, disabled }: Props) {
  if (!schema) {
    return <div className="text-sm text-muted-foreground">Nessuno schema disponibile per il tipo selezionato.</div>;
  }
  const handle = (e: IChangeEvent) => onChange((e.formData as Record<string, any>) || {});
  return (
    <Form
      schema={schema as any}
      formData={value}
      onChange={handle}
      validator={validator}
      uiSchema={uiSchema as any}
      disabled={disabled}
      noHtml5Validate
      liveValidate
      showErrorList={false}
    >
      <div />
    </Form>
  );
}
