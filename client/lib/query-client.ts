import { QueryClient, QueryFunction } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }

  let url = new URL(`https://${host}`);

  return url.href;
}

/**
 * Builds a full image URL from a path (handles both relative and absolute URLs)
 * @param path The image path (e.g., "/uploads/image.jpg" or "https://domain.com/uploads/image.jpg")
 * @returns {string} The full image URL, or empty string for invalid/unsupported URLs
 */
export function getImageUrl(path: string | null | undefined): string {
  if (!path) {
    return "";
  }
  
  const host = process.env.EXPO_PUBLIC_DOMAIN || "okeno.app";
  
  // Invalid URL types that can't be loaded from server
  if (path.startsWith("file://") || path.startsWith("blob:")) {
    return "";
  }
  
  // If it's already an absolute URL, return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    // Check if it's using an old development domain and needs to be rewritten
    if (path.includes("/uploads/")) {
      // Extract just the /uploads/... part and rebuild with current domain
      const uploadsIndex = path.indexOf("/uploads/");
      if (uploadsIndex !== -1) {
        const relativePath = path.substring(uploadsIndex);
        return `https://${host}${relativePath}`;
      }
    }
    return path;
  }
  
  // It's a relative path, build full URL
  return `https://${host}${path}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep cached data longer
      retry: 2,
      networkMode: 'offlineFirst', // Use cached data when offline
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
      networkMode: 'offlineFirst',
    },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'okeno-cache',
});

export const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days - keep persisted data longer
  buster: 'v1', // Cache version - change this to bust the cache if needed
};
