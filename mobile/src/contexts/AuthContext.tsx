import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { getToken, setToken, clearToken } from "../lib/authStorage";
import { setUnauthorizedHandler, apiRequest } from "../lib/api";
import type { User } from "../lib/types";

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const logout = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await apiRequest<User>("/api/auth/me");
      setUser(me);
    } catch {
      await logout();
    }
  }, [logout]);

  const login = useCallback(async (token: string, loggedInUser: User) => {
    await setToken(token);
    setUser(loggedInUser);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    (async () => {
      const token = await getToken();
      if (token) {
        await refreshUser();
      }
      setIsLoading(false);
    })();
    return () => setUnauthorizedHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated: !!user, user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
