import {
  users,
  posts,
  likes,
  saves,
  comments,
  chats,
  messages,
  messageReactions,
  notifications,
  sessions,
  hiddenUsers,
  archivedPosts,
  chatSettings,
  reports,
  blockedUsers,
  type User,
  type InsertUser,
  type Post,
  type InsertPost,
  type Like,
  type InsertLike,
  type Save,
  type InsertSave,
  type Comment,
  type InsertComment,
  type Chat,
  type InsertChat,
  type Message,
  type InsertMessage,
  type MessageReaction,
  type InsertMessageReaction,
  type Notification,
  type InsertNotification,
  type Session,
  type InsertSession,
  type ChatSettings,
  type InsertChatSettings,
  type Report,
  type InsertReport,
  type BlockedUser,
  type InsertBlockedUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByIdAndPin(id: string, pin: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastSeen(id: string): Promise<void>;
  searchUsers(query: string): Promise<User[]>;
  
  // Posts
  getPost(id: string): Promise<Post | undefined>;
  getPosts(limit?: number, offset?: number): Promise<Post[]>;
  getUserPosts(userId: string): Promise<Post[]>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: string, data: Partial<InsertPost>): Promise<Post | undefined>;
  deletePost(id: string): Promise<void>;
  
  // Likes
  getLike(userId: string, postId: string): Promise<Like | undefined>;
  getPostLikes(postId: string): Promise<Like[]>;
  getPostLikesCount(postId: string): Promise<number>;
  createLike(like: InsertLike): Promise<Like>;
  deleteLike(userId: string, postId: string): Promise<void>;
  
  // Saves
  getSave(userId: string, postId: string): Promise<Save | undefined>;
  getUserSaves(userId: string): Promise<Save[]>;
  createSave(save: InsertSave): Promise<Save>;
  deleteSave(userId: string, postId: string): Promise<void>;
  
  // Comments
  getPostComments(postId: string): Promise<Comment[]>;
  getPostCommentsCount(postId: string): Promise<number>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: string): Promise<void>;
  
  // Chats
  getChat(id: string): Promise<Chat | undefined>;
  getChatByUsers(user1Id: string, user2Id: string): Promise<Chat | undefined>;
  getUserChats(userId: string): Promise<Chat[]>;
  createChat(chat: InsertChat): Promise<Chat>;
  
  // Messages
  getChatMessages(chatId: string, limit?: number, offset?: number): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: string, content: string): Promise<Message | undefined>;
  deleteMessage(id: string): Promise<void>;
  markMessagesAsRead(chatId: string, userId: string): Promise<void>;
  getUnreadMessagesCount(chatId: string, userId: string): Promise<number>;
  
  // Message Reactions
  getMessageReactions(messageId: string): Promise<MessageReaction[]>;
  addMessageReaction(reaction: InsertMessageReaction): Promise<MessageReaction>;
  removeMessageReaction(messageId: string, userId: string, emoji: string): Promise<void>;
  
  // Notifications
  getUserNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  getUnreadNotificationsCount(userId: string): Promise<number>;
  
  // Sessions
  getUserSessions(userId: string): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  deleteSession(id: string): Promise<void>;
  deleteAllUserSessions(userId: string): Promise<void>;
  
  // Hidden users
  hideUser(userId: string, hiddenUserId: string): Promise<void>;
  unhideUser(userId: string, hiddenUserId: string): Promise<void>;
  getHiddenUsers(userId: string): Promise<string[]>;
  
  // Archive
  archivePost(userId: string, postId: string): Promise<void>;
  unarchivePost(userId: string, postId: string): Promise<void>;
  getArchivedPosts(userId: string): Promise<string[]>;
  
  // Chat settings
  getChatSettings(userId: string, otherUserId: string): Promise<ChatSettings | undefined>;
  getAllChatSettings(userId: string): Promise<ChatSettings[]>;
  upsertChatSettings(settings: InsertChatSettings): Promise<ChatSettings>;
  
  // Reports
  createReport(report: InsertReport): Promise<Report>;
  
  // Blocked users
  blockUser(userId: string, blockedUserId: string): Promise<void>;
  unblockUser(userId: string, blockedUserId: string): Promise<void>;
  getBlockedUsers(userId: string): Promise<string[]>;
  isBlocked(userId: string, blockedUserId: string): Promise<boolean>;
  
  // Account deletion
  deleteUser(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByIdAndPin(id: string, pin: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.id, id), eq(users.pin, pin)));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserLastSeen(id: string): Promise<void> {
    await db.update(users).set({ lastSeen: new Date() }).where(eq(users.id, id));
  }

  async searchUsers(query: string): Promise<User[]> {
    const searchQuery = `%${query.toLowerCase()}%`;
    return db.select().from(users).where(
      sql`LOWER(${users.username}) LIKE ${searchQuery}`
    ).limit(20);
  }

  // Posts
  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async getPosts(limit = 50, offset = 0): Promise<Post[]> {
    return db.select().from(posts).orderBy(desc(posts.createdAt)).limit(limit).offset(offset);
  }

  async getUserPosts(userId: string): Promise<Post[]> {
    return db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.createdAt));
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
  }

  async updatePost(id: string, data: Partial<InsertPost>): Promise<Post | undefined> {
    const [updatedPost] = await db.update(posts).set(data).where(eq(posts.id, id)).returning();
    return updatedPost || undefined;
  }

  async deletePost(id: string): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
  }

  // Likes
  async getLike(userId: string, postId: string): Promise<Like | undefined> {
    const [like] = await db.select().from(likes).where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    return like || undefined;
  }

  async getPostLikes(postId: string): Promise<Like[]> {
    return db.select().from(likes).where(eq(likes.postId, postId));
  }

  async getPostLikesCount(postId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(likes).where(eq(likes.postId, postId));
    return Number(result[0]?.count || 0);
  }

  async createLike(like: InsertLike): Promise<Like> {
    const [newLike] = await db.insert(likes).values(like).returning();
    return newLike;
  }

  async deleteLike(userId: string, postId: string): Promise<void> {
    await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
  }

  // Saves
  async getSave(userId: string, postId: string): Promise<Save | undefined> {
    const [save] = await db.select().from(saves).where(and(eq(saves.userId, userId), eq(saves.postId, postId)));
    return save || undefined;
  }

  async getUserSaves(userId: string): Promise<Save[]> {
    return db.select().from(saves).where(eq(saves.userId, userId)).orderBy(desc(saves.createdAt));
  }

  async createSave(save: InsertSave): Promise<Save> {
    const [newSave] = await db.insert(saves).values(save).returning();
    return newSave;
  }

  async deleteSave(userId: string, postId: string): Promise<void> {
    await db.delete(saves).where(and(eq(saves.userId, userId), eq(saves.postId, postId)));
  }

  // Comments
  async getPostComments(postId: string): Promise<Comment[]> {
    return db.select().from(comments).where(eq(comments.postId, postId)).orderBy(desc(comments.createdAt));
  }

  async getPostCommentsCount(postId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(comments).where(eq(comments.postId, postId));
    return Number(result[0]?.count || 0);
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();
    return newComment;
  }

  async deleteComment(id: string): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
  }

  // Chats
  async getChat(id: string): Promise<Chat | undefined> {
    const [chat] = await db.select().from(chats).where(eq(chats.id, id));
    return chat || undefined;
  }

  async getChatByUsers(user1Id: string, user2Id: string): Promise<Chat | undefined> {
    const [chat] = await db.select().from(chats).where(
      or(
        and(eq(chats.user1Id, user1Id), eq(chats.user2Id, user2Id)),
        and(eq(chats.user1Id, user2Id), eq(chats.user2Id, user1Id))
      )
    );
    return chat || undefined;
  }

  async getUserChats(userId: string): Promise<Chat[]> {
    return db.select().from(chats).where(
      or(eq(chats.user1Id, userId), eq(chats.user2Id, userId))
    ).orderBy(desc(chats.updatedAt));
  }

  async createChat(chat: InsertChat): Promise<Chat> {
    console.log('Storage creating chat:', chat);
    const [newChat] = await db.insert(chats).values(chat).returning();
    return newChat;
  }

  // Messages
  async getChatMessages(chatId: string, limit = 100, offset = 0): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.chatId, chatId)).orderBy(desc(messages.createdAt)).limit(limit).offset(offset);
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    await db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, message.chatId));
    return newMessage;
  }

  async updateMessage(id: string, content: string): Promise<Message | undefined> {
    const [updated] = await db.update(messages).set({ content, isEdited: true }).where(eq(messages.id, id)).returning();
    return updated;
  }

  async deleteMessage(id: string): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
  }

  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    await db.update(messages).set({ isRead: true }).where(
      and(eq(messages.chatId, chatId), sql`${messages.senderId} != ${userId}`)
    );
  }

  async getUnreadMessagesCount(chatId: string, userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(messages).where(
      and(eq(messages.chatId, chatId), sql`${messages.senderId} != ${userId}`, eq(messages.isRead, false))
    );
    return Number(result[0]?.count || 0);
  }

  // Message Reactions
  async getMessageReactions(messageId: string): Promise<MessageReaction[]> {
    return db.select().from(messageReactions).where(eq(messageReactions.messageId, messageId));
  }

  async addMessageReaction(reaction: InsertMessageReaction): Promise<MessageReaction> {
    // Delete any existing reaction from this user for this message (only one reaction allowed)
    await db.delete(messageReactions).where(
      and(
        eq(messageReactions.messageId, reaction.messageId),
        eq(messageReactions.userId, reaction.userId)
      )
    );
    
    const [newReaction] = await db.insert(messageReactions).values(reaction).returning();
    return newReaction;
  }

  async removeMessageReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await db.delete(messageReactions).where(
      and(
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.userId, userId),
        eq(messageReactions.emoji, emoji)
      )
    );
  }

  async getTotalUnreadMessagesCount(userId: string): Promise<number> {
    // Get all chats the user is part of
    const userChats = await db.select().from(chats).where(
      or(eq(chats.user1Id, userId), eq(chats.user2Id, userId))
    );
    
    if (userChats.length === 0) return 0;
    
    const chatIds = userChats.map(c => c.id);
    
    const result = await db.select({ count: sql<number>`count(*)` }).from(messages).where(
      and(
        sql`${messages.chatId} IN ${chatIds}`,
        sql`${messages.senderId} != ${userId}`,
        eq(messages.isRead, false)
      )
    );
    return Number(result[0]?.count || 0);
  }

  // Notifications
  async getUserNotifications(userId: string): Promise<any[]> {
    const notificationsData = await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
    
    // Get fromUser data for each notification
    const result = await Promise.all(notificationsData.map(async (notification) => {
      let fromUser = null;
      if (notification.fromUserId) {
        const [user] = await db.select({
          id: users.id,
          username: users.username,
          emoji: users.emoji,
        }).from(users).where(eq(users.id, notification.fromUserId)).limit(1);
        fromUser = user || null;
      }
      return { ...notification, fromUser };
    }));
    
    return result;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(notifications).where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
    return Number(result[0]?.count || 0);
  }

  // Sessions
  async getUserSessions(userId: string): Promise<Session[]> {
    return db.select().from(sessions).where(eq(sessions.userId, userId)).orderBy(desc(sessions.lastActive));
  }

  async createSession(session: InsertSession): Promise<Session> {
    const [newSession] = await db.insert(sessions).values(session).returning();
    return newSession;
  }

  async deleteSession(id: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  // Hidden users
  async hideUser(userId: string, hiddenUserId: string): Promise<void> {
    await db.insert(hiddenUsers).values({ userId, hiddenUserId });
  }

  async unhideUser(userId: string, hiddenUserId: string): Promise<void> {
    await db.delete(hiddenUsers).where(
      and(eq(hiddenUsers.userId, userId), eq(hiddenUsers.hiddenUserId, hiddenUserId))
    );
  }

  async getHiddenUsers(userId: string): Promise<string[]> {
    const result = await db.select({ hiddenUserId: hiddenUsers.hiddenUserId }).from(hiddenUsers).where(eq(hiddenUsers.userId, userId));
    return result.map(r => r.hiddenUserId);
  }

  // Archive
  async archivePost(userId: string, postId: string): Promise<void> {
    await db.insert(archivedPosts).values({ userId, postId });
  }

  async unarchivePost(userId: string, postId: string): Promise<void> {
    await db.delete(archivedPosts).where(
      and(eq(archivedPosts.userId, userId), eq(archivedPosts.postId, postId))
    );
  }

  async getArchivedPosts(userId: string): Promise<string[]> {
    const result = await db.select({ postId: archivedPosts.postId }).from(archivedPosts).where(eq(archivedPosts.userId, userId));
    return result.map(r => r.postId);
  }

  // Chat settings
  async getChatSettings(userId: string, otherUserId: string): Promise<ChatSettings | undefined> {
    const [settings] = await db.select().from(chatSettings).where(
      and(eq(chatSettings.userId, userId), eq(chatSettings.otherUserId, otherUserId))
    );
    return settings || undefined;
  }

  async getAllChatSettings(userId: string): Promise<ChatSettings[]> {
    return db.select().from(chatSettings).where(eq(chatSettings.userId, userId));
  }

  async upsertChatSettings(settings: InsertChatSettings & { isGlobal?: boolean }): Promise<ChatSettings> {
    const existing = await this.getChatSettings(settings.userId, settings.otherUserId);
    
    if (existing) {
      const [updated] = await db.update(chatSettings)
        .set({ 
          nickname: settings.nickname,
          backgroundImage: settings.backgroundImage,
          isGlobal: settings.isGlobal ?? existing.isGlobal,
          updatedAt: new Date()
        })
        .where(eq(chatSettings.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(chatSettings).values({
      userId: settings.userId,
      otherUserId: settings.otherUserId,
      nickname: settings.nickname,
      backgroundImage: settings.backgroundImage,
      isGlobal: settings.isGlobal ?? false,
    }).returning();
    return created;
  }
  
  async createChatSettings(settings: any): Promise<ChatSettings> {
    const [created] = await db.insert(chatSettings).values(settings).returning();
    return created;
  }

  async updateChatSettings(id: string, data: any): Promise<ChatSettings> {
    const [updated] = await db.update(chatSettings).set({ ...data, updatedAt: new Date() }).where(eq(chatSettings.id, id)).returning();
    return updated;
  }
  
  // Reports
  async createReport(report: InsertReport): Promise<Report> {
    const [newReport] = await db.insert(reports).values(report).returning();
    return newReport;
  }
  
  // Blocked users
  async blockUser(userId: string, blockedUserId: string): Promise<void> {
    const existing = await db.select().from(blockedUsers).where(
      and(eq(blockedUsers.userId, userId), eq(blockedUsers.blockedUserId, blockedUserId))
    );
    if (existing.length === 0) {
      await db.insert(blockedUsers).values({ userId, blockedUserId });
    }
  }
  
  async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    await db.delete(blockedUsers).where(
      and(eq(blockedUsers.userId, userId), eq(blockedUsers.blockedUserId, blockedUserId))
    );
  }
  
  async getBlockedUsers(userId: string): Promise<string[]> {
    const result = await db.select({ blockedUserId: blockedUsers.blockedUserId }).from(blockedUsers).where(eq(blockedUsers.userId, userId));
    return result.map(r => r.blockedUserId);
  }
  
  async isBlocked(userId: string, blockedUserId: string): Promise<boolean> {
    const result = await db.select().from(blockedUsers).where(
      and(eq(blockedUsers.userId, userId), eq(blockedUsers.blockedUserId, blockedUserId))
    );
    return result.length > 0;
  }
  
  // Account deletion - deletes user and all associated data
  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }
  
  // Admin functions
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }
  
  async setUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
    await db.update(users).set({ isAdmin }).where(eq(users.id, userId));
  }
  
  async setUserVerified(userId: string, isVerified: boolean): Promise<void> {
    await db.update(users).set({ isVerified }).where(eq(users.id, userId));
  }
  
  async setUserBanned(userId: string, isBanned: boolean): Promise<void> {
    await db.update(users).set({ isBanned }).where(eq(users.id, userId));
  }
  
  async isUserAdmin(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    return user?.isAdmin ?? false;
  }
}

export const storage = new DatabaseStorage();
