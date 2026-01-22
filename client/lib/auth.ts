import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "./query-client";

const USER_KEY = "@user";
const SESSION_KEY = "@session";

export interface User {
  id: string;
  username: string;
  pin: string;
  emoji: string;
  createdAt: string;
  lastSeen: string;
}

export interface AuthState {
  user: User | null;
  sessionId: string | null;
  isLoading: boolean;
}

export async function getStoredAuth(): Promise<{ user: User | null; sessionId: string | null }> {
  try {
    const [userJson, sessionId] = await Promise.all([
      AsyncStorage.getItem(USER_KEY),
      AsyncStorage.getItem(SESSION_KEY),
    ]);
    
    return {
      user: userJson ? JSON.parse(userJson) : null,
      sessionId,
    };
  } catch (error) {
    console.error("Failed to get stored auth:", error);
    return { user: null, sessionId: null };
  }
}

export async function storeAuth(user: User, sessionId: string): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
      AsyncStorage.setItem(SESSION_KEY, sessionId),
    ]);
  } catch (error) {
    console.error("Failed to store auth:", error);
  }
}

export async function clearAuth(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(USER_KEY),
      AsyncStorage.removeItem(SESSION_KEY),
    ]);
  } catch (error) {
    console.error("Failed to clear auth:", error);
  }
}

export async function register(username: string, pin: string): Promise<{ user: User; sessionId: string }> {
  const response = await apiRequest("POST", "/api/auth/register", { username, pin });
  const data = await response.json();
  await storeAuth(data.user, data.sessionId);
  return data;
}

export async function login(userId: string, pin: string): Promise<{ user: User; sessionId: string }> {
  const response = await apiRequest("POST", "/api/auth/login", { userId, pin });
  const data = await response.json();
  await storeAuth(data.user, data.sessionId);
  return data;
}

export async function logout(sessionId: string | null): Promise<void> {
  try {
    if (sessionId) {
      await apiRequest("POST", "/api/auth/logout", { sessionId });
    }
  } catch (error) {
    console.error("Logout API error:", error);
  }
  await clearAuth();
}
