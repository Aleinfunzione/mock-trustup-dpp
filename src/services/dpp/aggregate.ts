// /src/services/dpp/aggregate.ts
// Aggrega pillole in { gs1, iso, euDpp } (mock-first).
// Gli ARRAY vengono sovrascritti; per gli oggetti si fa deep-merge (ultimo vince).

export type Namespace = 'gs1' | 'iso' | 'euDpp';

export type Pill = {
  id: string;
  catalogId: string;      // es. "gs1-electronics@1.0"
  namespace: Namespace;   // 'gs1' | 'iso' | 'euDpp'
  version: string;        // es. "1.0"
  data: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
  errors?: string[];
};

export type Aggregated = { gs1: any; iso: any; euDpp: any };

export function aggregateAttributes(pills: Pill[] = []): Aggregated {
  const out: Aggregated = { gs1: {}, iso: {}, euDpp: {} };

  for (const p of pills) {
    if (!p || !p.namespace || typeof p.data !== 'object') continue;
    const target = out[p.namespace];
    deepMerge(target, p.data); // ultimo vince
  }

  return out;
}

function deepMerge(target: any, source: any) {
  if (!isObject(target) || !isObject(source)) {
    Object.assign(target, source);
    return target;
  }
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = (target as any)[key];
    if (isObject(sv) && isObject(tv)) {
      deepMerge(tv, sv);
    } else {
      // per array o valori primitivi: sovrascrivi
      (target as any)[key] = sv;
    }
  }
  return target;
}

function isObject(v: any): v is Record<string, any> {
  return v && typeof v === 'object' && !Array.isArray(v);
}
