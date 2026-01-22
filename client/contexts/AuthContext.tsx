import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, getStoredAuth, register as authRegister, login as authLogin, logout as authLogout } from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  sessionId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (username: string, pin: string) => Promise<void>;
  login: (userId: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const { user: storedUser, sessionId: storedSessionId } = await getStoredAuth();
      setUser(storedUser);
      setSessionId(storedSessionId);
    } catch (error) {
      console.error("Failed to load auth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const register = useCallback(async (username: string, pin: string) => {
    const result = await authRegister(username, pin);
    setUser(result.user);
    setSessionId(result.sessionId);
  }, []);

  const login = useCallback(async (userId: string, pin: string) => {
    const result = await authLogin(userId, pin);
    setUser(result.user);
    setSessionId(result.sessionId);
  }, []);

  const logout = useCallback(async () => {
    await authLogout(sessionId);
    setUser(null);
    setSessionId(null);
  }, [sessionId]);

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionId,
        isLoading,
        isAuthenticated: !!user,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
