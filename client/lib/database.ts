import { Platform } from 'react-native';
import * as SQLiteModule from 'expo-sqlite';

const DB_NAME = 'okeno_offline_v2.db';
const DB_VERSION = 2;

let db: SQLiteModule.SQLiteDatabase | null = null;
let initializationFailed = false;

const isNative = Platform.OS !== 'web';

export async function getDatabase(): Promise<SQLiteModule.SQLiteDatabase | null> {
  if (!isNative || initializationFailed) {
    return null;
  }
  
  if (!db) {
    try {
      if (typeof SQLiteModule.openDatabaseAsync !== 'function') {
        console.log('SQLite not available in this environment');
        initializationFailed = true;
        return null;
      }
      db = await SQLiteModule.openDatabaseAsync(DB_NAME);
      await initializeSchema(db);
    } catch (error) {
      console.log('SQLite initialization failed:', error);
      initializationFailed = true;
      return null;
    }
  }
  return db;
}

export async function resetDatabase(): Promise<void> {
  if (!isNative || initializationFailed) return;
  
  try {
    if (db) {
      await db.closeAsync();
      db = null;
    }
    
    await SQLiteModule.deleteDatabaseAsync(DB_NAME);
    db = await SQLiteModule.openDatabaseAsync(DB_NAME);
    await initializeSchema(db);
  } catch (error) {
    console.log('Database reset failed:', error);
    initializationFailed = true;
  }
}

async function initializeSchema(database: any): Promise<void> {
  if (!database) return;
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = OFF;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      emoji TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      is_verified INTEGER DEFAULT 0,
      is_banned INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      last_seen TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      local_image_path TEXT,
      caption TEXT,
      location TEXT,
      feeling TEXT,
      latitude TEXT,
      longitude TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_synced INTEGER DEFAULT 1,
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      is_liked INTEGER DEFAULT 0,
      is_saved INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      user1_id TEXT NOT NULL,
      user2_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_synced INTEGER DEFAULT 1,
      last_message TEXT,
      last_message_time TEXT,
      unread_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      local_image_path TEXT,
      voice_url TEXT,
      local_voice_path TEXT,
      voice_duration INTEGER,
      reply_to_id TEXT,
      is_edited INTEGER DEFAULT 0,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS saves (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      from_user_id TEXT,
      post_id TEXT,
      chat_id TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      is_synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sync_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
    CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
    CREATE INDEX IF NOT EXISTS idx_saves_user_id ON saves(user_id);
  `);
}

export interface LocalUser {
  id: string;
  username: string;
  emoji: string;
  isAdmin: boolean;
  isVerified: boolean;
  isBanned: boolean;
  createdAt: string;
  lastSeen: string | null;
  updatedAt: string;
  isSynced: boolean;
}

export interface LocalPost {
  id: string;
  userId: string;
  imageUrl: string;
  localImagePath: string | null;
  caption: string | null;
  location: string | null;
  feeling: string | null;
  latitude: string | null;
  longitude: string | null;
  createdAt: string;
  updatedAt: string;
  isSynced: boolean;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  user?: LocalUser;
}

export interface LocalChat {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
  updatedAt: string;
  isSynced: boolean;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
  otherUser?: LocalUser;
}

export interface LocalMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  imageUrl: string | null;
  localImagePath: string | null;
  voiceUrl: string | null;
  localVoicePath: string | null;
  voiceDuration: number | null;
  replyToId: string | null;
  isEdited: boolean;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  isSynced: boolean;
}

export async function saveUser(user: any): Promise<void> {
  const database = await getDatabase();
  if (!database) return;
  await database.runAsync(
    `INSERT OR REPLACE INTO users (id, username, emoji, is_admin, is_verified, is_banned, created_at, last_seen, updated_at, is_synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)`,
    [
      user.id,
      user.username,
      user.emoji,
      user.isAdmin ? 1 : 0,
      user.isVerified ? 1 : 0,
      user.isBanned ? 1 : 0,
      user.createdAt || new Date().toISOString(),
      user.lastSeen || null,
    ]
  );
}

export async function getUser(userId: string): Promise<LocalUser | null> {
  const database = await getDatabase();
  if (!database) return null;
  const result = await database.getFirstAsync<any>(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );
  if (!result) return null;
  return mapRowToUser(result);
}

export async function savePost(post: any, currentUserId: string): Promise<void> {
  const database = await getDatabase();
  if (!database) return;
  
  if (post.user) {
    await saveUser(post.user);
  }
  
  await database.runAsync(
    `INSERT OR REPLACE INTO posts (id, user_id, image_url, caption, location, feeling, latitude, longitude, created_at, updated_at, is_synced, likes_count, comments_count, is_liked, is_saved)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1, ?, ?, ?, ?)`,
    [
      post.id,
      post.userId,
      post.imageUrl,
      post.caption || null,
      post.location || null,
      post.feeling || null,
      post.latitude || null,
      post.longitude || null,
      post.createdAt,
      post.likesCount || 0,
      post.commentsCount || 0,
      post.isLiked ? 1 : 0,
      post.isSaved ? 1 : 0,
    ]
  );
}

export async function savePosts(posts: any[], currentUserId: string): Promise<void> {
  for (const post of posts) {
    await savePost(post, currentUserId);
  }
}

export async function getPosts(limit: number = 20, offset: number = 0): Promise<LocalPost[]> {
  const database = await getDatabase();
  if (!database) return [];
  const results = await database.getAllAsync<any>(
    `SELECT p.*, u.id as user_id, u.username, u.emoji, u.is_verified, u.is_admin
     FROM posts p
     LEFT JOIN users u ON p.user_id = u.id
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return results.map(row => mapRowToPost(row));
}

export async function getPostById(postId: string): Promise<LocalPost | null> {
  const database = await getDatabase();
  if (!database) return null;
  const result = await database.getFirstAsync<any>(
    `SELECT p.*, u.id as user_id, u.username, u.emoji, u.is_verified, u.is_admin
     FROM posts p
     LEFT JOIN users u ON p.user_id = u.id
     WHERE p.id = ?`,
    [postId]
  );
  if (!result) return null;
  return mapRowToPost(result);
}

export async function saveChat(chat: any, currentUserId: string): Promise<void> {
  const database = await getDatabase();
  if (!database) return;
  
  if (chat.user1) await saveUser(chat.user1);
  if (chat.user2) await saveUser(chat.user2);
  if (chat.otherUser) await saveUser(chat.otherUser);
  
  await database.runAsync(
    `INSERT OR REPLACE INTO chats (id, user1_id, user2_id, created_at, updated_at, is_synced, last_message, last_message_time, unread_count)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    [
      chat.id,
      chat.user1Id,
      chat.user2Id,
      chat.createdAt,
      chat.updatedAt,
      chat.lastMessage?.content || null,
      chat.lastMessage?.createdAt || null,
      chat.unreadCount || 0,
    ]
  );
}

export async function saveChats(chats: any[], currentUserId: string): Promise<void> {
  for (const chat of chats) {
    await saveChat(chat, currentUserId);
  }
}

export async function getChats(userId: string): Promise<LocalChat[]> {
  const database = await getDatabase();
  if (!database) return [];
  const results = await database.getAllAsync<any>(
    `SELECT c.*, 
            CASE WHEN c.user1_id = ? THEN u2.id ELSE u1.id END as other_user_id,
            CASE WHEN c.user1_id = ? THEN u2.username ELSE u1.username END as other_username,
            CASE WHEN c.user1_id = ? THEN u2.emoji ELSE u1.emoji END as other_emoji,
            CASE WHEN c.user1_id = ? THEN u2.is_verified ELSE u1.is_verified END as other_is_verified
     FROM chats c
     LEFT JOIN users u1 ON c.user1_id = u1.id
     LEFT JOIN users u2 ON c.user2_id = u2.id
     WHERE c.user1_id = ? OR c.user2_id = ?
     ORDER BY c.updated_at DESC`,
    [userId, userId, userId, userId, userId, userId]
  );
  return results.map(row => mapRowToChat(row, userId));
}

export async function saveMessage(message: any): Promise<void> {
  const database = await getDatabase();
  if (!database) return;
  await database.runAsync(
    `INSERT OR REPLACE INTO messages (id, chat_id, sender_id, content, image_url, voice_url, voice_duration, reply_to_id, is_edited, is_read, created_at, updated_at, is_synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)`,
    [
      message.id,
      message.chatId,
      message.senderId,
      message.content,
      message.imageUrl || null,
      message.voiceUrl || null,
      message.voiceDuration || null,
      message.replyToId || null,
      message.isEdited ? 1 : 0,
      message.isRead ? 1 : 0,
      message.createdAt,
    ]
  );
}

export async function saveMessages(messages: any[]): Promise<void> {
  for (const message of messages) {
    await saveMessage(message);
  }
}

export async function getMessages(chatId: string, limit: number = 50): Promise<LocalMessage[]> {
  const database = await getDatabase();
  if (!database) return [];
  const results = await database.getAllAsync<any>(
    `SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT ?`,
    [chatId, limit]
  );
  return results.map(row => mapRowToMessage(row));
}

export async function updatePostLikeStatus(postId: string, isLiked: boolean, likesCount: number): Promise<void> {
  const database = await getDatabase();
  if (!database) return;
  await database.runAsync(
    'UPDATE posts SET is_liked = ?, likes_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [isLiked ? 1 : 0, likesCount, postId]
  );
}

export async function updatePostSaveStatus(postId: string, isSaved: boolean): Promise<void> {
  const database = await getDatabase();
  if (!database) return;
  await database.runAsync(
    'UPDATE posts SET is_saved = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [isSaved ? 1 : 0, postId]
  );
}

export async function getSyncMetadata(key: string): Promise<string | null> {
  const database = await getDatabase();
  if (!database) return null;
  const result = await database.getFirstAsync<any>(
    'SELECT value FROM sync_metadata WHERE key = ?',
    [key]
  );
  return result?.value || null;
}

export async function setSyncMetadata(key: string, value: string): Promise<void> {
  const database = await getDatabase();
  if (!database) return;
  await database.runAsync(
    'INSERT OR REPLACE INTO sync_metadata (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [key, value]
  );
}

export async function clearAllData(): Promise<void> {
  const database = await getDatabase();
  if (!database) return;
  await database.execAsync(`
    DELETE FROM messages;
    DELETE FROM chats;
    DELETE FROM posts;
    DELETE FROM likes;
    DELETE FROM saves;
    DELETE FROM comments;
    DELETE FROM notifications;
    DELETE FROM users;
    DELETE FROM sync_metadata;
  `);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToUser(row: any): LocalUser {
  return {
    id: row.id,
    username: row.username,
    emoji: row.emoji,
    isAdmin: row.is_admin === 1,
    isVerified: row.is_verified === 1,
    isBanned: row.is_banned === 1,
    createdAt: row.created_at,
    lastSeen: row.last_seen,
    updatedAt: row.updated_at,
    isSynced: row.is_synced === 1,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToPost(row: any): LocalPost {
  return {
    id: row.id,
    userId: row.user_id,
    imageUrl: row.image_url,
    localImagePath: row.local_image_path,
    caption: row.caption,
    location: row.location,
    feeling: row.feeling,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isSynced: row.is_synced === 1,
    likesCount: row.likes_count || 0,
    commentsCount: row.comments_count || 0,
    isLiked: row.is_liked === 1,
    isSaved: row.is_saved === 1,
    user: row.username ? {
      id: row.user_id,
      username: row.username,
      emoji: row.emoji,
      isAdmin: row.is_admin === 1,
      isVerified: row.is_verified === 1,
      isBanned: false,
      createdAt: '',
      lastSeen: null,
      updatedAt: '',
      isSynced: true,
    } : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToChat(row: any, _currentUserId: string): LocalChat {
  return {
    id: row.id,
    user1Id: row.user1_id,
    user2Id: row.user2_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isSynced: row.is_synced === 1,
    lastMessage: row.last_message,
    lastMessageTime: row.last_message_time,
    unreadCount: row.unread_count || 0,
    otherUser: row.other_user_id ? {
      id: row.other_user_id,
      username: row.other_username,
      emoji: row.other_emoji,
      isAdmin: false,
      isVerified: row.other_is_verified === 1,
      isBanned: false,
      createdAt: '',
      lastSeen: null,
      updatedAt: '',
      isSynced: true,
    } : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToMessage(row: any): LocalMessage {
  return {
    id: row.id,
    chatId: row.chat_id,
    senderId: row.sender_id,
    content: row.content,
    imageUrl: row.image_url,
    localImagePath: row.local_image_path,
    voiceUrl: row.voice_url,
    localVoicePath: row.local_voice_path,
    voiceDuration: row.voice_duration,
    replyToId: row.reply_to_id,
    isEdited: row.is_edited === 1,
    isRead: row.is_read === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isSynced: row.is_synced === 1,
  };
}
