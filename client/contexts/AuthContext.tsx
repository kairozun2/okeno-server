import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { User, getStoredAuth, storeAuth, register as authRegister, login as authLogin, logout as authLogout } from "@/lib/auth";
import { getApiUrl } from "@/lib/query-client";
import { registerForPushNotificationsAsync, unregisterPushNotifications } from "@/lib/push-notifications";
import { performFullSync } from "@/lib/sync";

interface AuthContextType {
  user: User | null;
  sessionId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (username: string, pin: string) => Promise<void>;
  login: (userId: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pushTokenRef = useRef<string | null>(null);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (user?.id && !pushTokenRef.current) {
      registerForPushNotificationsAsync(user.id).then((token) => {
        pushTokenRef.current = token;
      });
    }
    if (user?.id) {
      performFullSync(user.id).catch(() => {});
    }
  }, [user?.id]);

  const loadStoredAuth = async () => {
    try {
      const { user: storedUser, sessionId: storedSessionId } = await getStoredAuth();
      
      if (storedUser && storedSessionId) {
        // Set stored data immediately to prevent random emoji flicker
        setUser(storedUser);
        setSessionId(storedSessionId);

        // Refresh user data from server to get latest fields
        try {
          const url = new URL(`/api/users/${storedUser.id}`, getApiUrl());
          const response = await fetch(url.toString(), { 
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            },
            credentials: "include" 
          });
          if (response.ok) {
            const freshUserData = await response.json();
            const updatedUser = { ...storedUser, ...freshUserData };
            setUser(updatedUser);
            await storeAuth(updatedUser, storedSessionId);
          }
        } catch {
          // Keep using stored data if refresh fails
        }
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  };

  const register = useCallback(async (username: string, pin: string) => {
    const result = await authRegister(username, pin);
    setUser(result.user);
    setSessionId(result.sessionId);
    // storeAuth is already called in authRegister
  }, []);

  const login = useCallback(async (userId: string, pin: string) => {
    const result = await authLogin(userId, pin);
    setUser(result.user);
    setSessionId(result.sessionId);
    // storeAuth is already called in authLogin
  }, []);

  const logout = useCallback(async () => {
    if (user?.id && pushTokenRef.current) {
      await unregisterPushNotifications(user.id, pushTokenRef.current);
      pushTokenRef.current = null;
    }
    await authLogout(sessionId);
    queryClient.clear();
    setUser(null);
    setSessionId(null);
  }, [sessionId, user?.id, queryClient]);

  const refreshUser = useCallback(async () => {
    if (!user?.id) return;
    try {
      const url = new URL(`/api/users/${user.id}`, getApiUrl());
      const response = await fetch(url.toString(), { 
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        credentials: "include" 
      });
      if (response.ok) {
        const freshUserData = await response.json();
        // Force state update by creating a new object reference
        setUser({ ...user, ...freshUserData });
        if (sessionId) {
          await storeAuth({ ...user, ...freshUserData }, sessionId);
        }
      }
    } catch {
      // Silent fail
    }
  }, [user, sessionId]);

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
        refreshUser,
        setUser,
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
