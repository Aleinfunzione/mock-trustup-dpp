import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Props = {
  value: string
  onChange: (v: string) => void
  id?: string
  label?: string
  placeholder?: string
  error?: string
}

export default function SeedPhraseInput({
  value,
  onChange,
  id = "seed",
  label = "Seed (BIP39)",
  placeholder = "inserisci le 12/24 parole…",
  error,
}: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
      />
      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Consiglio: incolla la seed come singola riga, separando le parole con uno spazio.
        </p>
      )}
    </div>
  )
}
