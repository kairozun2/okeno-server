import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";

// Helper to get random emoji
function generateEmoji(): string {
  const emojis = [
    "🐸", "🦊", "🐱", "🐶", "🐼", "🐨", "🦁", "🐯", "🐮", "🐷",
    "🐵", "🐔", "🦄", "🐝", "🦋", "🐢", "🐙", "🦀", "🐬", "🦈",
    "🦅", "🦆", "🦉", "🐺", "🦝", "🦔", "🐿️", "🦜", "🦚", "🦩",
    "🐲", "🌸", "🌺", "🌻", "🌼", "🌷", "🌹", "🍀", "🌵", "🌴",
  ];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, pin } = req.body;
      
      if (!username || !pin || pin.length !== 4) {
        return res.status(400).json({ error: "Username and 4-digit PIN required" });
      }

      const forbiddenWords = [
        "admin", "root", "support", "official", "moderator",
        "порно", "секс", "педофил", "расизм", "дискриминация",
        "матерное_слово1", "матерное_слово2", // Example placeholders
      ];

      const lowerUsername = username.toLowerCase();
      if (forbiddenWords.some(word => lowerUsername.includes(word))) {
        return res.status(400).json({ error: "Username contains forbidden words" });
      }

      if (username.length > 20) {
        return res.status(400).json({ error: "Username is too long (max 20 characters)" });
      }

      const emoji = generateEmoji();
      const user = await storage.createUser({ username, pin, emoji });
      
      // Create session
      const session = await storage.createSession({
        userId: user.id,
        deviceInfo: req.headers["user-agent"] || "Unknown",
      });

      res.json({ user, sessionId: session.id });
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

      const user = await storage.getUserByIdAndPin(userId, pin);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      await storage.updateUserLastSeen(user.id);
      
      // Create session
      const session = await storage.createSession({
        userId: user.id,
        deviceInfo: req.headers["user-agent"] || "Unknown",
      });

      res.json({ user, sessionId: session.id });
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

  // User routes
  app.get("/api/users/search", async (req, res) => {
    try {
      const query = (req.query.q as string) || "";
      if (query.length === 0) {
        return res.json([]);
      }
      const users = await storage.searchUsers(query);
      res.json(users.map(u => ({ id: u.id, username: u.username, emoji: u.emoji })));
    } catch (error) {
      console.error("Search users error:", error);
      res.status(500).json({ error: "Failed to search users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.get("/api/users/:id/posts", async (req, res) => {
    try {
      const posts = await storage.getUserPosts(req.params.id);
      const archivedIds = await storage.getArchivedPosts(req.params.id);
      res.json(posts.filter(p => !archivedIds.includes(p.id)));
    } catch (error) {
      console.error("Get user posts error:", error);
      res.status(500).json({ error: "Failed to get posts" });
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

  app.delete("/api/users/:id/sessions", async (req, res) => {
    try {
      await storage.deleteAllUserSessions(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete sessions error:", error);
      res.status(500).json({ error: "Failed to delete sessions" });
    }
  });

  // Posts routes
  app.get("/api/posts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      const posts = await storage.getPosts(limit, offset);
      
      const postsWithUser = await Promise.all(posts.map(async (post) => {
        const archivedIds = await storage.getArchivedPosts(post.userId);
        if (archivedIds.includes(post.id)) return null;

        const user = await storage.getUser(post.userId);
        const likesCount = await storage.getPostLikesCount(post.id);
        const commentsCount = await storage.getPostCommentsCount(post.id);
        
        return {
          ...post,
          user: user ? { id: user.id, username: user.username, emoji: user.emoji } : undefined,
          likesCount,
          commentsCount,
          isLiked: false, 
          isSaved: false  
        };
      }));
      
      res.json(postsWithUser.filter(p => p !== null));
    } catch (error) {
      console.error("Get posts error:", error);
      res.status(500).json({ error: "Failed to get posts" });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Get post error:", error);
      res.status(500).json({ error: "Failed to get post" });
    }
  });

  app.post("/api/posts", async (req, res) => {
    try {
      const { userId, imageUrl, location, latitude, longitude } = req.body;
      
      if (!userId || !imageUrl) {
        return res.status(400).json({ error: "User ID and image URL required" });
      }

      const post = await storage.createPost({
        userId,
        imageUrl,
        location: location || null,
        latitude: latitude || null,
        longitude: longitude || null,
      });

      res.json(post);
    } catch (error) {
      console.error("Create post error:", error);
      res.status(500).json({ error: "Failed to create post" });
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

  app.patch("/api/posts/:id", async (req, res) => {
    try {
      const { location } = req.body;
      const post = await storage.updatePost(req.params.id, { location: location || null });
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Update post error:", error);
      res.status(500).json({ error: "Failed to update post" });
    }
  });

  app.post("/api/posts/:id/archive", async (req, res) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      await storage.archivePost(post.userId, post.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Archive post error:", error);
      res.status(500).json({ error: "Failed to archive post" });
    }
  });

  // Likes routes
  app.get("/api/posts/:id/likes", async (req, res) => {
    try {
      const count = await storage.getPostLikesCount(req.params.id);
      res.json({ count });
    } catch (error) {
      console.error("Get likes error:", error);
      res.status(500).json({ error: "Failed to get likes" });
    }
  });

  app.get("/api/posts/:postId/likes/:userId", async (req, res) => {
    try {
      const like = await storage.getLike(req.params.userId, req.params.postId);
      res.json({ liked: !!like });
    } catch (error) {
      console.error("Check like error:", error);
      res.status(500).json({ error: "Failed to check like" });
    }
  });

  app.post("/api/likes", async (req, res) => {
    try {
      const { userId, postId } = req.body;
      
      const existingLike = await storage.getLike(userId, postId);
      if (existingLike) {
        return res.status(400).json({ error: "Already liked" });
      }

      const like = await storage.createLike({ userId, postId });
      
      // Create notification
      const post = await storage.getPost(postId);
      if (post && post.userId !== userId) {
        await storage.createNotification({
          userId: post.userId,
          type: "like",
          fromUserId: userId,
          postId,
        });
      }

      res.json(like);
    } catch (error) {
      console.error("Create like error:", error);
      res.status(500).json({ error: "Failed to like" });
    }
  });

  app.delete("/api/likes", async (req, res) => {
    try {
      const { userId, postId } = req.body;
      await storage.deleteLike(userId, postId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete like error:", error);
      res.status(500).json({ error: "Failed to unlike" });
    }
  });

  // Saves routes
  app.get("/api/users/:id/saves", async (req, res) => {
    try {
      const saves = await storage.getUserSaves(req.params.id);
      res.json(saves);
    } catch (error) {
      console.error("Get saves error:", error);
      res.status(500).json({ error: "Failed to get saves" });
    }
  });

  app.get("/api/posts/:postId/saves/:userId", async (req, res) => {
    try {
      const save = await storage.getSave(req.params.userId, req.params.postId);
      res.json({ saved: !!save });
    } catch (error) {
      console.error("Check save error:", error);
      res.status(500).json({ error: "Failed to check save" });
    }
  });

  app.post("/api/saves", async (req, res) => {
    try {
      const { userId, postId } = req.body;
      
      const existingSave = await storage.getSave(userId, postId);
      if (existingSave) {
        return res.status(400).json({ error: "Already saved" });
      }

      const save = await storage.createSave({ userId, postId });
      res.json(save);
    } catch (error) {
      console.error("Create save error:", error);
      res.status(500).json({ error: "Failed to save" });
    }
  });

  app.delete("/api/saves", async (req, res) => {
    try {
      const { userId, postId } = req.body;
      await storage.deleteSave(userId, postId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete save error:", error);
      res.status(500).json({ error: "Failed to unsave" });
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
          user: user ? { id: user.id, username: user.username, emoji: user.emoji } : undefined,
        };
      }));
      res.json(commentsWithUser);
    } catch (error) {
      console.error("Get comments error:", error);
      res.status(500).json({ error: "Failed to get comments" });
    }
  });

  app.get("/api/posts/:id/comments/count", async (req, res) => {
    try {
      const count = await storage.getPostCommentsCount(req.params.id);
      res.json({ count });
    } catch (error) {
      console.error("Get comments count error:", error);
      res.status(500).json({ error: "Failed to get comments count" });
    }
  });

  app.post("/api/comments", async (req, res) => {
    try {
      const { userId, postId, content } = req.body;
      
      if (!userId || !postId || !content) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const comment = await storage.createComment({ userId, postId, content });
      
      // Create notification
      const post = await storage.getPost(postId);
      if (post && post.userId !== userId) {
        await storage.createNotification({
          userId: post.userId,
          type: "comment",
          fromUserId: userId,
          postId,
        });
      }

      res.json(comment);
    } catch (error) {
      console.error("Create comment error:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  app.delete("/api/comments/:id", async (req, res) => {
    try {
      await storage.deleteComment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete comment error:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // Chats routes
  app.get("/api/users/:id/chats", async (req, res) => {
    try {
      const userId = req.params.id;
      const userChats = await storage.getUserChats(userId);
      
      // Fetch other user details and last message for each chat
      const chatsWithDetails = await Promise.all(
        userChats.map(async (chat) => {
          const otherUserId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;
          const otherUser = await storage.getUser(otherUserId);
          const chatMessages = await storage.getChatMessages(chat.id, 1);
          const lastMessage = chatMessages[0]?.content || null;
          const unreadCount = await storage.getUnreadMessagesCount(chat.id, userId);
          
          return {
            ...chat,
            otherUser: otherUser ? {
              id: otherUser.id,
              username: otherUser.username,
              emoji: otherUser.emoji,
            } : null,
            lastMessage,
            unreadCount,
          };
        })
      );
      
      res.json(chatsWithDetails);
    } catch (error) {
      console.error("Get chats error:", error);
      res.status(500).json({ error: "Failed to get chats" });
    }
  });

  app.get("/api/chats/:id", async (req, res) => {
    try {
      const chat = await storage.getChat(req.params.id);
      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }
      res.json(chat);
    } catch (error) {
      console.error("Get chat error:", error);
      res.status(500).json({ error: "Failed to get chat" });
    }
  });

  app.post("/api/chats", async (req, res) => {
    try {
      const { user1Id, user2Id } = req.body;
      
      if (!user1Id || !user2Id) {
        return res.status(400).json({ error: "Missing user IDs" });
      }

      // Check if chat already exists
      const existingChat = await storage.getChatByUsers(user1Id, user2Id);
      if (existingChat) {
        return res.json(existingChat);
      }

      const chat = await storage.createChat({ user1Id, user2Id });
      res.json(chat);
    } catch (error) {
      console.error("Create chat error:", error);
      res.status(500).json({ error: "Failed to create chat" });
    }
  });

  // Messages routes
  app.get("/api/chats/:id/messages", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const messages = await storage.getChatMessages(req.params.id, limit, offset);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const { chatId, senderId, content, replyToId } = req.body;
      
      if (!chatId || !senderId || !content) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const message = await storage.createMessage({ chatId, senderId, content, replyToId: replyToId || null });
      
      // Create notification for recipient
      const chat = await storage.getChat(chatId);
      if (chat) {
        const recipientId = chat.user1Id === senderId ? chat.user2Id : chat.user1Id;
        await storage.createNotification({
          userId: recipientId,
          type: "message",
          fromUserId: senderId,
          chatId,
        });
      }

      res.json(message);
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.patch("/api/messages/:id", async (req, res) => {
    try {
      const { content, senderId } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }

      const existingMessage = await storage.getMessage(req.params.id);
      if (!existingMessage) {
        return res.status(404).json({ error: "Message not found" });
      }

      if (existingMessage.senderId !== senderId) {
        return res.status(403).json({ error: "Can only edit your own messages" });
      }

      const message = await storage.updateMessage(req.params.id, content);
      res.json(message);
    } catch (error) {
      console.error("Edit message error:", error);
      res.status(500).json({ error: "Failed to edit message" });
    }
  });

  app.delete("/api/messages/:id", async (req, res) => {
    try {
      const { senderId } = req.body;
      
      const existingMessage = await storage.getMessage(req.params.id);
      if (!existingMessage) {
        return res.status(404).json({ error: "Message not found" });
      }

      if (existingMessage.senderId !== senderId) {
        return res.status(403).json({ error: "Can only delete your own messages" });
      }

      await storage.deleteMessage(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete message error:", error);
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  app.post("/api/chats/:id/read", async (req, res) => {
    try {
      const { userId } = req.body;
      await storage.markMessagesAsRead(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark read error:", error);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  app.get("/api/chats/:id/unread/:userId", async (req, res) => {
    try {
      const count = await storage.getUnreadMessagesCount(req.params.id, req.params.userId);
      res.json({ count });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({ error: "Failed to get unread count" });
    }
  });

  // Typing status (in-memory, expires after 3 seconds)
  const typingStatus = new Map<string, number>();

  app.post("/api/chats/:id/typing", async (req, res) => {
    try {
      const { userId } = req.body;
      const chatId = req.params.id;
      const key = `${chatId}:${userId}`;
      typingStatus.set(key, Date.now());
      res.json({ success: true });
    } catch (error) {
      console.error("Set typing error:", error);
      res.status(500).json({ error: "Failed to set typing status" });
    }
  });

  app.get("/api/chats/:id/typing/:oderId", async (req, res) => {
    try {
      const chatId = req.params.id;
      const otherUserId = req.params.oderId;
      const key = `${chatId}:${otherUserId}`;
      const timestamp = typingStatus.get(key);
      
      // Typing expires after 3 seconds
      const isTyping = timestamp && (Date.now() - timestamp) < 3000;
      
      if (!isTyping && timestamp) {
        typingStatus.delete(key);
      }
      
      res.json({ isTyping: !!isTyping });
    } catch (error) {
      console.error("Get typing error:", error);
      res.status(500).json({ error: "Failed to get typing status" });
    }
  });

  app.get("/api/users/:id/unread-messages", async (req, res) => {
    try {
      const userId = req.params.id;
      const count = await storage.getTotalUnreadMessagesCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Get total unread count error:", error);
      res.status(500).json({ error: "Failed to get total unread count" });
    }
  });

  // Notifications routes
  app.get("/api/users/:id/notifications", async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.params.id);
      res.json(notifications);
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
            user: user ? { id: user.id, username: user.username, emoji: user.emoji } : undefined,
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
          return user ? { id: user.id, username: user.username, emoji: user.emoji } : null;
        })
      );
      res.json(blockedUsers.filter(u => u !== null));
    } catch (error) {
      console.error("Get blocked users error:", error);
      res.status(500).json({ error: "Failed to get blocked users" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
