// src/components/ui/select.tsx
import * as React from "react";

type SelectRootProps = {
  value?: string;
  onValueChange?: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
};

type CtxType = {
  value?: string;
  onValueChange?: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

const Ctx = React.createContext<CtxType | null>(null);

export function Select({ value, onValueChange, disabled, children }: SelectRootProps) {
  return (
    <Ctx.Provider value={{ value, onValueChange, disabled }}>
      <div className={disabled ? "opacity-70 pointer-events-none" : ""}>{children}</div>
    </Ctx.Provider>
  );
}

export function SelectTrigger(props: React.HTMLAttributes<HTMLDivElement>) {
  // è solo un contenitore per compatibilità con shadcn
  return <div {...props} />;
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = React.useContext(Ctx);
  if (ctx) ctx.placeholder = placeholder;
  // non renderizza nulla: il vero <select> è in SelectContent
  return null;
}

export function SelectContent({
  children,
  className = "",
}: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(Ctx) as CtxType;
  const items = React.Children.toArray(children).filter(
    (c: any) => c?.type?.displayName === "SelectItem"
  ) as React.ReactElement<{ value: string; children: React.ReactNode }>[];

  return (
    <div className={className}>
      <select
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none
                   dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700"
        value={ctx?.value ?? ""}
        onChange={(e) => ctx?.onValueChange?.(e.target.value)}
        disabled={ctx?.disabled}
      >
        <option value="" disabled hidden>
          {ctx?.placeholder ?? "Seleziona..."}
        </option>
        {items.map((it) => (
          <option key={it.props.value} value={it.props.value}>
            {it.props.children}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SelectItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  // verrà letto da SelectContent con displayName
  return <option value={value}>{children}</option>;
}
SelectItem.displayName = "SelectItem";
