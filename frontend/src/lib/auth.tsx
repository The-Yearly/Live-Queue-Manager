"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api, setUnauthorizedHandler, tokenStore, type Manager } from "./api";

interface AuthState {
  manager: Manager | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [manager, setManager] = useState<Manager | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    tokenStore.clear();
    setManager(null);
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    api<{ manager: Manager }>("/auth/me")
      .then((r) => setManager(r.manager))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api<{ token: string; manager: Manager }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    tokenStore.set(r.token);
    setManager(r.manager);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const r = await api<{ token: string; manager: Manager }>(
        "/auth/register",
        {
          method: "POST",
          body: { name, email, password },
        },
      );
      tokenStore.set(r.token);
      setManager(r.manager);
    },
    [],
  );

  const value = useMemo(
    () => ({ manager, loading, login, register, logout }),
    [manager, loading, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
