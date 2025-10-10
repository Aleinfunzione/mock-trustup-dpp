import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";

type Props = {
  label: string;
  value?: string;                 // "yyyy-mm-dd" o ISO completo
  onChange: (isoDate: string) => void;
  required?: boolean;
  disabled?: boolean;
};

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseDate(value?: string) {
  if (!value) return undefined;
  const v = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

export default function DateField({ label, value, onChange, required, disabled }: Props) {
  const [open, setOpen] = React.useState(false);
  const parsed = parseDate(value);
  const display = parsed ? parsed.toLocaleDateString("it-IT") : "Seleziona data";

  return (
    <div className="grid gap-1">
      <div className="text-sm font-medium">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start w-full" disabled={disabled}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {display}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <Calendar
            mode="single"
            selected={parsed}
            onSelect={(d) => {
              if (!d) return;
              onChange(toISODate(d));
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
