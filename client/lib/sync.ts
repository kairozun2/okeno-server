import { getNetworkStatus, checkConnectivity } from '@/hooks/useNetworkStatus';
import { getApiUrl } from './query-client';
import * as Database from './database';

type SyncCallback = () => void;
let syncListeners: Set<SyncCallback> = new Set();
let isSyncing = false;

export function addSyncListener(callback: SyncCallback): () => void {
  syncListeners.add(callback);
  return () => syncListeners.delete(callback);
}

function notifySyncListeners() {
  syncListeners.forEach(cb => cb());
}

export async function fetchAndCacheFeed(userId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
  const isOnline = await checkConnectivity();
  
  if (!isOnline) {
    const localPosts = await Database.getPosts(limit, offset);
    return localPosts;
  }
  
  try {
    const baseUrl = getApiUrl();
    const url = new URL(`/api/feed?limit=${limit}&offset=${offset}`, baseUrl);
    
    const response = await fetch(url.toString(), {
      credentials: 'include',
    });
    
    if (!response.ok) {
      const localPosts = await Database.getPosts(limit, offset);
      return localPosts;
    }
    
    const posts = await response.json();
    
    await Database.savePosts(posts, userId);
    
    notifySyncListeners();
    
    return posts;
  } catch (error) {
    console.log('Feed fetch failed, using local data:', error);
    const localPosts = await Database.getPosts(limit, offset);
    return localPosts;
  }
}

export async function fetchAndCacheChats(userId: string): Promise<any[]> {
  const isOnline = await checkConnectivity();
  
  if (!isOnline) {
    const localChats = await Database.getChats(userId);
    return localChats;
  }
  
  try {
    const baseUrl = getApiUrl();
    const url = new URL(`/api/users/${userId}/chats`, baseUrl);
    
    const response = await fetch(url.toString(), {
      credentials: 'include',
    });
    
    if (!response.ok) {
      const localChats = await Database.getChats(userId);
      return localChats;
    }
    
    const chats = await response.json();
    
    await Database.saveChats(chats, userId);
    
    notifySyncListeners();
    
    return chats;
  } catch (error) {
    console.log('Chats fetch failed, using local data:', error);
    const localChats = await Database.getChats(userId);
    return localChats;
  }
}

export async function fetchAndCacheMessages(chatId: string, limit: number = 50): Promise<any[]> {
  const isOnline = await checkConnectivity();
  
  if (!isOnline) {
    const localMessages = await Database.getMessages(chatId, limit);
    return localMessages;
  }
  
  try {
    const baseUrl = getApiUrl();
    const url = new URL(`/api/chats/${chatId}/messages`, baseUrl);
    
    const response = await fetch(url.toString(), {
      credentials: 'include',
    });
    
    if (!response.ok) {
      const localMessages = await Database.getMessages(chatId, limit);
      return localMessages;
    }
    
    const messages = await response.json();
    
    await Database.saveMessages(messages);
    
    notifySyncListeners();
    
    return messages;
  } catch (error) {
    console.log('Messages fetch failed, using local data:', error);
    const localMessages = await Database.getMessages(chatId, limit);
    return localMessages;
  }
}

export async function fetchAndCacheUser(userId: string): Promise<any | null> {
  const isOnline = await checkConnectivity();
  
  if (!isOnline) {
    const localUser = await Database.getUser(userId);
    return localUser;
  }
  
  try {
    const baseUrl = getApiUrl();
    const url = new URL(`/api/users/${userId}`, baseUrl);
    
    const response = await fetch(url.toString(), {
      credentials: 'include',
    });
    
    if (!response.ok) {
      const localUser = await Database.getUser(userId);
      return localUser;
    }
    
    const user = await response.json();
    
    await Database.saveUser(user);
    
    return user;
  } catch (error) {
    console.log('User fetch failed, using local data:', error);
    const localUser = await Database.getUser(userId);
    return localUser;
  }
}

export async function syncPendingChanges(): Promise<void> {
  if (isSyncing) return;
  
  const isOnline = await checkConnectivity();
  if (!isOnline) return;
  
  isSyncing = true;
  
  try {
    notifySyncListeners();
  } finally {
    isSyncing = false;
  }
}

export async function performFullSync(userId: string): Promise<void> {
  const isOnline = await checkConnectivity();
  if (!isOnline) return;
  
  try {
    await Promise.all([
      fetchAndCacheFeed(userId, 50, 0),
      fetchAndCacheChats(userId),
    ]);
    
    await Database.setSyncMetadata('lastFullSync', new Date().toISOString());
    
    notifySyncListeners();
  } catch (error) {
    console.log('Full sync failed:', error);
  }
}

export async function getLastSyncTime(): Promise<string | null> {
  return Database.getSyncMetadata('lastFullSync');
}
