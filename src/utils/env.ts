// src/utils/env.ts
// Gestione variabili di ambiente per l'applicazione TRUSTUP MOCK

/**
 * Ottiene la seed phrase admin dalle variabili di ambiente o localStorage
 * Priorità: VITE_ADMIN_SEED -> localStorage -> undefined
 */
export function getAdminSeed(): string | undefined {
  try {
    // Prima controlla le variabili di ambiente Vite
    const envSeed = (import.meta as any).env?.VITE_ADMIN_SEED as string | undefined;
    if (envSeed && envSeed.trim()) {
      console.log('🔑 Admin seed trovata nelle variabili di ambiente');
      return envSeed.trim();
    }
    
    // Poi controlla il localStorage
    const localSeed = localStorage.getItem("VITE_ADMIN_SEED");
    if (localSeed && localSeed.trim()) {
      console.log('🔑 Admin seed trovata nel localStorage');
      return localSeed.trim();
    }
    
    console.log('⚠️ Admin seed non trovata');
    return undefined;
  } catch (error) {
    console.error('❌ Errore nel recupero admin seed:', error);
    return undefined;
  }
}

/**
 * Ottiene la seed phrase company per demo
 */
export function getCompanySeed(): string | undefined {
  try {
    const envSeed = (import.meta as any).env?.VITE_COMPANY_SEED as string | undefined;
    if (envSeed && envSeed.trim()) return envSeed.trim();
    
    const localSeed = localStorage.getItem("VITE_COMPANY_SEED");
    if (localSeed && localSeed.trim()) return localSeed.trim();
    
    return undefined;
  } catch (error) {
    console.error('❌ Errore nel recupero company seed:', error);
    return undefined;
  }
}

/**
 * Ottiene la seed phrase creator per demo
 */
export function getCreatorSeed(): string | undefined {
  try {
    const envSeed = (import.meta as any).env?.VITE_CREATOR_SEED as string | undefined;
    if (envSeed && envSeed.trim()) return envSeed.trim();
    
    const localSeed = localStorage.getItem("VITE_CREATOR_SEED");
    if (localSeed && localSeed.trim()) return localSeed.trim();
    
    return undefined;
  } catch (error) {
    console.error('❌ Errore nel recupero creator seed:', error);
    return undefined;
  }
}

/**
 * Ottiene username admin di default
 */
export function getDefaultAdminUsername(): string {
  try {
    const envUsername = (import.meta as any).env?.VITE_DEFAULT_ADMIN_USERNAME as string | undefined;
    return envUsername?.trim() || 'admin';
  } catch (error) {
    console.error('❌ Errore nel recupero admin username:', error);
    return 'admin';
  }
}

/**
 * Ottiene password admin di default
 */
export function getDefaultAdminPassword(): string {
  try {
    const envPassword = (import.meta as any).env?.VITE_DEFAULT_ADMIN_PASSWORD as string | undefined;
    return envPassword?.trim() || 'demo';
  } catch (error) {
    console.error('❌ Errore nel recupero admin password:', error);
    return 'demo';
  }
}

/**
 * Verifica se siamo in modalità debug
 */
export function isDebugMode(): boolean {
  try {
    const debugMode = (import.meta as any).env?.VITE_DEBUG_MODE as string | undefined;
    return debugMode === 'true' || debugMode === '1';
  } catch (error) {
    return false;
  }
}

/**
 * Verifica se siamo in modalità development
 */
export function isDevelopment(): boolean {
  try {
    return (import.meta as any).env?.DEV === true;
  } catch (error) {
    return false;
  }
}

/**
 * Verifica se siamo in modalità production
 */
export function isProduction(): boolean {
  try {
    return (import.meta as any).env?.PROD === true;
  } catch (error) {
    return false;
  }
}

/**
 * Configura admin seed per testing (solo development)
 */
export function setupAdminSeedForTesting(): void {
  if (!isDevelopment()) {
    console.warn('⚠️ Setup admin seed disponibile solo in development');
    return;
  }

  const defaultAdminSeed = "clutch captain shoe salt awake harvest setup primary inmate ugly aeon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon";
  
  try {
    localStorage.setItem("VITE_ADMIN_SEED", defaultAdminSeed);
    localStorage.setItem("ForceAdminDemo", "1");
    console.log('✅ Admin seed configurata per testing');
    console.log('🔄 Ricarica la pagina per applicare le modifiche');
  } catch (error) {
    console.error('❌ Errore nella configurazione admin seed:', error);
  }
}

/**
 * Pulisce tutte le configurazioni di testing
 */
export function clearTestingConfig(): void {
  try {
    localStorage.removeItem("VITE_ADMIN_SEED");
    localStorage.removeItem("VITE_COMPANY_SEED");
    localStorage.removeItem("VITE_CREATOR_SEED");
    localStorage.removeItem("ForceAdminDemo");
    console.log('🧹 Configurazioni di testing pulite');
  } catch (error) {
    console.error('❌ Errore nella pulizia configurazioni:', error);
  }
}

/**
 * Ottiene informazioni di debug sull'ambiente
 */
export function getEnvironmentInfo(): {
  isDev: boolean;
  isProd: boolean;
  isDebug: boolean;
  hasAdminSeed: boolean;
  hasCompanySeed: boolean;
  hasCreatorSeed: boolean;
} {
  return {
    isDev: isDevelopment(),
    isProd: isProduction(),
    isDebug: isDebugMode(),
    hasAdminSeed: Boolean(getAdminSeed()),
    hasCompanySeed: Boolean(getCompanySeed()),
    hasCreatorSeed: Boolean(getCreatorSeed()),
  };
}

/**
 * Valida una seed phrase BIP39 (validazione semplificata)
 */
export function isValidSeedPhrase(seed: string): boolean {
  if (!seed || typeof seed !== 'string') return false;
  
  const words = seed.trim().split(/\s+/);
  
  // Verifica lunghezza (12, 15, 18, 21, 24 parole per BIP39)
  const validLengths = [12, 15, 18, 21, 24];
  if (!validLengths.includes(words.length)) return false;
  
  // Verifica che tutte le parole siano alfanumeriche
  const validWordPattern = /^[a-z]+$/i;
  return words.every(word => validWordPattern.test(word));
}

// Export di tutte le funzioni per facilità d'uso
export const env = {
  getAdminSeed,
  getCompanySeed,
  getCreatorSeed,
  getDefaultAdminUsername,
  getDefaultAdminPassword,
  isDebugMode,
  isDevelopment,
  isProduction,
  setupAdminSeedForTesting,
  clearTestingConfig,
  getEnvironmentInfo,
  isValidSeedPhrase,
};

// Log di inizializzazione (solo in development)
if (isDevelopment()) {
  console.log('🔧 Environment Utils inizializzato:', getEnvironmentInfo());
}