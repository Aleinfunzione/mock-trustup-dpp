// src/stores/uiStore.ts
// Store UI-agnostico per notifiche/toast. Nessuna dipendenza UI.
// Un consumer (es. ToastBridge) si sottoscrive e mostra i toast con shadcn.

export type ToastVariant = "default" | "destructive" | "success" | "warning" | "info";

export type ToastMessage = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // ms
};

type Listener = (t: ToastMessage) => void;

const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function pushToast(msg: ToastMessage) {
  for (const l of Array.from(listeners)) {
    try {
      l(msg);
    } catch {
      // ignora listener difettosi
    }
  }
}

// Helpers semantici

export function notifySuccess(title: string, description?: string) {
  pushToast({ title, description, variant: "success" });
}

export function notifyInfo(title: string, description?: string) {
  pushToast({ title, description, variant: "info" });
}

export function notifyWarning(title: string, description?: string) {
  pushToast({ title, description, variant: "warning" });
}

export function notifyError(err: unknown, fallback = "Errore") {
  const { title, description, variant } = mapErrorToToast(err, fallback);
  pushToast({ title, description, variant });
}

// Mappatura errori comuni (crediti, policy, rete, AJV)

function mapErrorToToast(err: unknown, fallback: string): ToastMessage {
  const e = err as any;
  const code = toUpperStr(e?.code || e?.name || "");
  const msg = toUpperStr(e?.message || "");
  const reason = toUpperStr(e?.reason || "");

  // Crediti
  if (code.includes("INSUFFICIENT") || msg.includes("INSUFFICIENT") || reason.includes("INSUFFICIENT")) {
    return {
      title: "Crediti insufficienti",
      description: "Ricarica o trasferisci crediti per completare l’azione.",
      variant: "destructive",
    };
  }
  if (code.includes("CHAIN_BLOCKED") || msg.includes("CHAIN_BLOCKED")) {
    return {
      title: "Catena pagatore bloccata",
      description: "Verifica policy di sponsorizzazione o account coinvolti.",
      variant: "warning",
    };
  }
  if (code.includes("POLICY") || msg.includes("POLICY")) {
    return {
      title: "Azione negata dalla policy crediti",
      description: "Controlla regole di consumo o limiti configurati.",
      variant: "warning",
    };
  }

  // AJV (validazione schema)
  if (code.includes("AJV") || e?.errors?.[0]?.instancePath || e?.validation?.ajv) {
    const first = e?.errors?.[0];
    const path = first?.instancePath || first?.schemaPath || "";
    return {
      title: "Dati non validi",
      description: compact(`${first?.message ?? "Errore di validazione"}` + (path ? ` (${path})` : "")),
      variant: "destructive",
    };
  }

  // Network/HTTP
  if (code.includes("FETCH") || code.includes("NETWORK") || code.includes("HTTP")) {
    return {
      title: "Errore di rete",
      description: "Riprova più tardi o verifica la connessione.",
      variant: "warning",
    };
  }

  // Fallback
  return {
    title: fallback,
    description: compact(e?.message ?? undefined),
    variant: "destructive",
  };
}

function toUpperStr(v: unknown): string {
  return String(v ?? "").toUpperCase();
}

function compact(s?: string) {
  if (!s) return undefined;
  const t = String(s).trim();
  return t.length ? t : undefined;
}
