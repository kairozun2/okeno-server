import { QueryClient, QueryFunction, onlineManager } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import NetInfo from "@react-native-community/netinfo";

onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

export function getApiUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    // Fallback to localhost for local development
    host = "localhost:5000";
  }

  const cleanHost = host.replace(/^https?:\/\//, '');
  
  // Use http for localhost / local IP addresses, https for everything else
  const isLocal = cleanHost.startsWith('localhost') 
    || cleanHost.startsWith('127.0.0.1')
    || cleanHost.startsWith('192.168.')
    || cleanHost.startsWith('10.')
    || cleanHost.startsWith('172.');
  const protocol = isLocal ? 'http' : 'https';
  return `${protocol}://${cleanHost}`;
}

const PRODUCTION_DOMAIN = "okeno.app";

export function getShareDomain(): string {
  const envDomain = process.env.EXPO_PUBLIC_DOMAIN;
  if (envDomain && !envDomain.includes("replit") && !envDomain.includes("localhost")) {
    return envDomain.replace(/^https?:\/\//, '').replace(/:.*$/, '');
  }
  return PRODUCTION_DOMAIN;
}

export function getShareUrl(path: string): string {
  return `https://${getShareDomain()}${path.startsWith('/') ? path : '/' + path}`;
}

export function getImageUrl(path: string | null | undefined): string {
  if (!path) {
    return "";
  }
  
  if (path.startsWith("blob:")) {
    return "";
  }
  
  if (path.startsWith("file://") || path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    if (path.includes("/uploads/")) {
      const uploadsIndex = path.indexOf("/uploads/");
      if (uploadsIndex !== -1) {
        const relativePath = path.substring(uploadsIndex);
        return getApiUrl().replace(/\/$/, '') + relativePath;
      }
    }
    return path;
  }
  
  const baseUrl = getApiUrl().replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
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
      staleTime: 1000 * 60 * 30,
      gcTime: 1000 * 60 * 60 * 24 * 30,
      retry: (failureCount, error) => {
        if (!onlineManager.isOnline()) return false;
        if (error instanceof TypeError && error.message === 'Network request failed') return false;
        return failureCount < 2;
      },
      networkMode: 'offlineFirst',
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
  throttleTime: 2000,
});

export const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 24 * 30,
  buster: 'v2',
  dehydrateOptions: {
    shouldDehydrateQuery: (query: any) => {
      return query.state.status === 'success' && query.state.data !== undefined;
    },
  },
};
