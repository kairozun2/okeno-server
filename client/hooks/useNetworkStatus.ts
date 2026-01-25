import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
}

let globalNetworkStatus: NetworkStatus = {
  isConnected: true,
  isInternetReachable: true,
  type: 'unknown',
};

let listeners: Set<(status: NetworkStatus) => void> = new Set();
let subscription: NetInfoSubscription | null = null;

function updateGlobalStatus(state: NetInfoState) {
  globalNetworkStatus = {
    isConnected: state.isConnected ?? true,
    isInternetReachable: state.isInternetReachable,
    type: state.type,
  };
  listeners.forEach(listener => listener(globalNetworkStatus));
}

function initNetworkListener() {
  if (subscription) return;
  
  subscription = NetInfo.addEventListener(updateGlobalStatus);
  
  NetInfo.fetch().then(updateGlobalStatus);
}

initNetworkListener();

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(globalNetworkStatus);

  useEffect(() => {
    const listener = (newStatus: NetworkStatus) => {
      setStatus(newStatus);
    };
    
    listeners.add(listener);
    
    setStatus(globalNetworkStatus);
    
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return status;
}

export function useIsOnline(): boolean {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  
  if (isInternetReachable !== null) {
    return isInternetReachable;
  }
  return isConnected;
}

export function getNetworkStatus(): NetworkStatus {
  return globalNetworkStatus;
}

export async function checkConnectivity(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isInternetReachable ?? state.isConnected ?? false;
  } catch {
    return false;
  }
}
