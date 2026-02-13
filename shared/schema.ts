import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - registration with username + 4-digit PIN, unique emoji avatar
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull(),
  pin: text("pin").notNull(),
  emoji: text("emoji").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  isBanned: boolean("is_banned").default(false).notNull(),
  profileEffect: text("profile_effect"),
  stripeCustomerId: text("stripe_customer_id"),
  isPremium: boolean("is_premium").default(false).notNull(),
  usernameColor: text("username_color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  lastUsernameChange: timestamp("last_username_change"),
});

// Posts table - photos with location
export const posts = pgTable("posts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  location: text("location"),
  feeling: text("feeling"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Likes table
export const likes = pgTable("likes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Saves (bookmarks) table
export const saves = pgTable("saves", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Comments table
export const comments = pgTable("comments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chats table (conversation between two users)
export const chats = pgTable("chats", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  user1Id: varchar("user1_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  user2Id: varchar("user2_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isGroup: boolean("is_group").default(false).notNull(),
  name: text("name"),
  groupEmoji: text("group_emoji"),
  backgroundImage: text("background_image"),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Group chat members table
export const groupChatMembers = pgTable("group_chat_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  voiceUrl: text("voice_url"),
  voiceDuration: integer("voice_duration"),
  replyToId: varchar("reply_to_id"),
  isEdited: boolean("is_edited").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isRead: boolean("is_read").default(false).notNull(),
});

// Message reactions table
export const messageReactions = pgTable("message_reactions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'like', 'comment', 'message'
  fromUserId: varchar("from_user_id").references(() => users.id, { onDelete: "cascade" }),
  postId: varchar("post_id").references(() => posts.id, { onDelete: "cascade" }),
  chatId: varchar("chat_id").references(() => chats.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sessions table for active sessions
export const sessions = pgTable("sessions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deviceInfo: text("device_info"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActive: timestamp("last_active").defaultNow().notNull(),
});

// Hidden users table
export const hiddenUsers = pgTable("hidden_users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  hiddenUserId: varchar("hidden_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Archived posts table
export const archivedPosts = pgTable("archived_posts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reports table - for reporting inappropriate content/users
export const reports = pgTable("reports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportedUserId: varchar("reported_user_id").references(() => users.id, { onDelete: "cascade" }),
  reportedPostId: varchar("reported_post_id").references(() => posts.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: text("status").default("pending").notNull(), // pending, reviewed, resolved
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Blocked users table
export const blockedUsers = pgTable("blocked_users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  blockedUserId: varchar("blocked_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Push tokens table - for push notifications
export const pushTokens = pgTable("push_tokens", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  platform: text("platform"), // 'ios', 'android', 'web'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Mini apps table - user-created mini applications
export const miniApps = pgTable("mini_apps", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  emoji: text("emoji").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  isPublished: boolean("is_published").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Chat settings table - per-user customizations for each chat
export const chatSettings = pgTable("chat_settings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  otherUserId: varchar("other_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  nickname: text("nickname"),
  backgroundImage: text("background_image"),
  isGlobal: boolean("is_global").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  likes: many(likes),
  saves: many(saves),
  comments: many(comments),
  sentMessages: many(messages),
  notifications: many(notifications),
  sessions: many(sessions),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  likes: many(likes),
  saves: many(saves),
  comments: many(comments),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [likes.postId],
    references: [posts.id],
  }),
}));

export const savesRelations = relations(saves, ({ one }) => ({
  user: one(users, {
    fields: [saves.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [saves.postId],
    references: [posts.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user1: one(users, {
    fields: [chats.user1Id],
    references: [users.id],
  }),
  user2: one(users, {
    fields: [chats.user2Id],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  reactions: many(messageReactions),
}));

export const messageReactionsRelations = relations(messageReactions, ({ one }) => ({
  message: one(messages, {
    fields: [messageReactions.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [messageReactions.userId],
    references: [users.id],
  }),
}));

export const groupChatMembersRelations = relations(groupChatMembers, ({ one }) => ({
  chat: one(chats, { fields: [groupChatMembers.chatId], references: [chats.id] }),
  user: one(users, { fields: [groupChatMembers.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  fromUser: one(users, {
    fields: [notifications.fromUserId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [notifications.postId],
    references: [posts.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const chatSettingsRelations = relations(chatSettings, ({ one }) => ({
  user: one(users, {
    fields: [chatSettings.userId],
    references: [users.id],
  }),
  otherUser: one(users, {
    fields: [chatSettings.otherUserId],
    references: [users.id],
  }),
}));

export const miniAppsRelations = relations(miniApps, ({ one }) => ({
  creator: one(users, {
    fields: [miniApps.creatorId],
    references: [users.id],
  }),
}));

export const pushTokensRelations = relations(pushTokens, ({ one }) => ({
  user: one(users, {
    fields: [pushTokens.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  pin: true,
  emoji: true,
});

export const insertPostSchema = createInsertSchema(posts).pick({
  userId: true,
  imageUrl: true,
  caption: true,
  location: true,
  feeling: true,
  latitude: true,
  longitude: true,
});

export const insertLikeSchema = createInsertSchema(likes).pick({
  userId: true,
  postId: true,
});

export const insertSaveSchema = createInsertSchema(saves).pick({
  userId: true,
  postId: true,
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  userId: true,
  postId: true,
  content: true,
});

export const insertChatSchema = createInsertSchema(chats).pick({
  user1Id: true,
  user2Id: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  chatId: true,
  senderId: true,
  content: true,
  imageUrl: true,
  voiceUrl: true,
  voiceDuration: true,
  replyToId: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  type: true,
  fromUserId: true,
  postId: true,
  chatId: true,
});

export const insertSessionSchema = createInsertSchema(sessions).pick({
  userId: true,
  deviceInfo: true,
});

export const insertChatSettingsSchema = createInsertSchema(chatSettings).pick({
  userId: true,
  otherUserId: true,
  nickname: true,
  backgroundImage: true,
});

export const insertReportSchema = createInsertSchema(reports).pick({
  reporterId: true,
  reportedUserId: true,
  reportedPostId: true,
  reason: true,
});

export const insertBlockedUserSchema = createInsertSchema(blockedUsers).pick({
  userId: true,
  blockedUserId: true,
});

export const insertMessageReactionSchema = createInsertSchema(messageReactions).pick({
  messageId: true,
  userId: true,
  emoji: true,
});

export const insertPushTokenSchema = createInsertSchema(pushTokens).pick({
  userId: true,
  token: true,
  platform: true,
});

export const insertGroupChatMemberSchema = createInsertSchema(groupChatMembers).pick({
  chatId: true,
  userId: true,
  role: true,
});

export const insertMiniAppSchema = createInsertSchema(miniApps).pick({
  creatorId: true,
  name: true,
  description: true,
  url: true,
  emoji: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertLike = z.infer<typeof insertLikeSchema>;
export type Like = typeof likes.$inferSelect;
export type InsertSave = z.infer<typeof insertSaveSchema>;
export type Save = typeof saves.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Chat = typeof chats.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertChatSettings = z.infer<typeof insertChatSettingsSchema>;
export type ChatSettings = typeof chatSettings.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertBlockedUser = z.infer<typeof insertBlockedUserSchema>;
export type BlockedUser = typeof blockedUsers.$inferSelect;
export type InsertMessageReaction = z.infer<typeof insertMessageReactionSchema>;
export type MessageReaction = typeof messageReactions.$inferSelect;
export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;
export type PushToken = typeof pushTokens.$inferSelect;
export type InsertGroupChatMember = z.infer<typeof insertGroupChatMemberSchema>;
export type GroupChatMember = typeof groupChatMembers.$inferSelect;
export type InsertMiniApp = z.infer<typeof insertMiniAppSchema>;
export type MiniApp = typeof miniApps.$inferSelect;
