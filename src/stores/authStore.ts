import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Tipi per l'autenticazione
export type UserRole = 'admin' | 'company' | 'creator' | 'operator' | 'machine';

export interface User {
  id: string;
  did: string;
  role: UserRole;
  username?: string;
  companyId?: string;
  companyName?: string;
  name?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  // Login con seed phrase (per utenti normali)
  loginWithSeed: (seedPhrase: string) => Promise<boolean>;
  
  // Login admin separato (username/password o seed)
  loginAdmin: (usernameOrSeed: string, password?: string) => boolean;
  
  // Logout
  logout: () => void;
  
  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Verifica permessi
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  isAdmin: () => boolean;
}

export type AuthStore = AuthState & AuthActions;

// Store Zustand con persistenza
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Stato iniziale
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login con seed phrase (utenti normali)
      loginWithSeed: async (seedPhrase: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        
        try {
          // Simula validazione seed phrase
          if (!seedPhrase || seedPhrase.trim().length < 10) {
            set({ error: "Seed phrase non valida", isLoading: false });
            return false;
          }

          // Simula derivazione DID dalla seed
          const did = `did:iota:${seedPhrase.split(' ').slice(0, 3).join('')}`;
          
          // Determina il ruolo basato sulla seed (logica semplificata)
          let role: UserRole = 'operator'; // default
          let companyId = 'company-1';
          let companyName = 'Demo Company';
          
          if (seedPhrase.includes('company')) {
            role = 'company';
          } else if (seedPhrase.includes('creator')) {
            role = 'creator';
          } else if (seedPhrase.includes('machine')) {
            role = 'machine';
          }

          const user: User = {
            id: `user-${Date.now()}`,
            did,
            role,
            companyId,
            companyName,
            name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
            isActive: true,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return true;
        } catch (error) {
          console.error('Errore login con seed:', error);
          set({
            error: 'Errore durante il login',
            isLoading: false,
          });
          return false;
        }
      },

      // Login admin separato
      loginAdmin: (usernameOrSeed: string, password?: string): boolean => {
        set({ isLoading: true, error: null });

        try {
          let isValidAdmin = false;

          // Metodo 1: Username/Password tradizionale
          if (password) {
            const validUsername = usernameOrSeed === 'admin';
            const validPassword = password === 'demo';
            isValidAdmin = validUsername && validPassword;
          }
          // Metodo 2: Admin seed (seed phrase lunga)
          else {
            // Verifica se è una seed phrase admin valida
            const isAdminSeed = usernameOrSeed.includes('clutch captain shoe') || 
                              usernameOrSeed.split(' ').length >= 12;
            isValidAdmin = isAdminSeed;
          }

          if (!isValidAdmin) {
            set({ 
              error: 'Credenziali admin non valide', 
              isLoading: false 
            });
            return false;
          }

          // Crea utente admin
          const adminUser: User = {
            id: 'admin-root',
            did: 'did:iota:admin:root',
            role: 'admin',
            username: 'admin',
            name: 'System Administrator',
            email: 'admin@trustup.mock',
            isActive: true,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };

          set({
            user: adminUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          console.log('✅ Login admin riuscito:', adminUser);
          return true;

        } catch (error) {
          console.error('❌ Errore login admin:', error);
          set({
            error: 'Errore durante il login admin',
            isLoading: false,
          });
          return false;
        }
      },

      // Logout
      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        
        // Pulisci localStorage
        localStorage.removeItem('ForceAdminDemo');
        
        console.log('🚪 Logout effettuato');
      },

      // Utility functions
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      
      setError: (error: string | null) => set({ error }),
      
      clearError: () => set({ error: null }),

      // Verifica permessi
      hasRole: (role: UserRole): boolean => {
        const { user } = get();
        return user?.role === role;
      },

      hasAnyRole: (roles: UserRole[]): boolean => {
        const { user } = get();
        return user ? roles.includes(user.role) : false;
      },

      isAdmin: (): boolean => {
        const { user } = get();
        return user?.role === 'admin';
      },
    }),
    {
      name: 'auth-storage', // nome per localStorage
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Hook per verifiche rapide
export const useAuth = () => {
  const store = useAuthStore();
  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    isAdmin: store.isAdmin(),
    hasRole: store.hasRole,
    hasAnyRole: store.hasAnyRole,
    login: store.loginWithSeed,
    loginAdmin: store.loginAdmin,
    logout: store.logout,
  };
};

// Selettori per performance
export const selectUser = (state: AuthStore) => state.user;
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;
export const selectIsAdmin = (state: AuthStore) => state.user?.role === 'admin';
export const selectUserRole = (state: AuthStore) => state.user?.role;

// Utility per debugging
export const debugAuth = () => {
  const state = useAuthStore.getState();
  console.log('🔍 Auth Debug:', {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
  });
};