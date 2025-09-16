type ToastOpts = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function useToast() {
  function toast({ title, description, variant }: ToastOpts) {
    const msg = [title, description].filter(Boolean).join(" — ");
    if (variant === "destructive") {
      alert(`❌ ${msg || "Errore"}`);
    } else {
      alert(`✅ ${msg || "OK"}`);
    }
    // Per debug
    // eslint-disable-next-line no-console
    console.log("[toast]", { title, description, variant });
  }
  return { toast };
}
