import { Textarea } from "@/components/ui/textarea";

export default function SeedPhraseInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Inserisci le 12/24 parole BIP39"
    />
  );
}
