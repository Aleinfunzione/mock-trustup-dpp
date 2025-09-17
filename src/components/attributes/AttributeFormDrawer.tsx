// /src/components/attributes/AttributeFormDrawer.tsx
import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import { loadSchema } from "@/services/schema/loader";
import { validateData, formatAjvErrors } from "@/services/schema/validate";

export type AttributeFormDrawerProps = {
  schemaPath: string;
  title: string;
  defaultValue?: any;
  onSubmit: (data: any) => void;
  trigger?: React.ReactNode;
};

export default function AttributeFormDrawer({
  schemaPath,
  title,
  defaultValue,
  onSubmit,
  trigger,
}: AttributeFormDrawerProps) {
  const [open, setOpen] = React.useState(false);
  const [schema, setSchema] = React.useState<any | null>(null);
  const [errors, setErrors] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      loadSchema(schemaPath)
        .then(setSchema)
        .catch((e) => setErrors([String(e)]));
    }
  }, [open, schemaPath]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger ?? <Button variant="outline" size="sm">Compila attributi</Button>}</SheetTrigger>
      <SheetContent className="w-[640px] sm:w-[640px]">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        {!schema ? (
          <div className="text-sm text-muted-foreground mt-4">Caricamento schema…</div>
        ) : (
          <div className="mt-2">
            <Form
              schema={schema}
              validator={validator}
              formData={defaultValue}
              liveValidate
              onChange={(e) => {
                const r = validateData(schema, e.formData);
                setErrors(formatAjvErrors(r.errors));
              }}
              onSubmit={(e) => {
                const r = validateData(schema, e.formData);
                if (!r.ok) {
                  setErrors(formatAjvErrors(r.errors));
                  return;
                }
                onSubmit(e.formData);
                setOpen(false);
              }}
            >
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit">Salva</Button>
              </div>
            </Form>

            {errors.length > 0 && (
              <ul className="mt-3 text-sm text-destructive list-disc pl-5">
                {errors.map((er, i) => (
                  <li key={i}>{er}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
