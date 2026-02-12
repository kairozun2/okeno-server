import { pool } from "./db";

export async function addDatabaseIndexes() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_likes_user_post ON likes(user_id, post_id);
      CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
      CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
      CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_chats_user1 ON chats(user1_id);
      CREATE INDEX IF NOT EXISTS idx_chats_user2 ON chats(user2_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_group_chat_members_chat ON group_chat_members(chat_id);
      CREATE INDEX IF NOT EXISTS idx_group_chat_members_user ON group_chat_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_saves_user_id ON saves(user_id);
      CREATE INDEX IF NOT EXISTS idx_saves_post_id ON saves(post_id);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);
    console.log("Database indexes created/verified successfully");
  } catch (error) {
    console.error("Error creating indexes:", error);
  } finally {
    client.release();
  }
}
