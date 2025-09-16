import { useAuthStore } from "@/stores/authStore";

export function useAuth() {
  const currentUser = useAuthStore(s => s.currentUser);
  const loginSeed = useAuthStore(s => s.loginSeed);
  const loginAdmin = useAuthStore(s => s.loginAdmin);
  const logout = useAuthStore(s => s.logout);

  return { currentUser, loginSeed, loginAdmin, logout };
}
