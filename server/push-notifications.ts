import { storage } from "./storage";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: "default" | null;
  badge?: number;
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    const tokens = await storage.getUserPushTokens(userId);
    
    if (tokens.length === 0) {
      return;
    }

    const messages: PushMessage[] = tokens.map((t) => ({
      to: t.token,
      title,
      body,
      data,
      sound: "default",
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error("Push notification failed:", await response.text());
    }
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
}

export async function sendNewMessageNotification(
  recipientId: string,
  senderName: string,
  senderEmoji: string,
  messagePreview: string,
  chatId: string
): Promise<void> {
  const truncatedMessage = messagePreview.length > 50 
    ? messagePreview.substring(0, 50) + "..." 
    : messagePreview;
    
  await sendPushNotification(
    recipientId,
    `${senderEmoji} ${senderName}`,
    truncatedMessage,
    { type: "message", chatId }
  );
}

export async function sendLikeNotification(
  postOwnerId: string,
  likerName: string,
  likerEmoji: string,
  postId: string
): Promise<void> {
  await sendPushNotification(
    postOwnerId,
    "New like",
    `${likerEmoji} ${likerName} liked your post`,
    { type: "like", postId }
  );
}

export async function sendCallNotification(
  recipientId: string,
  callerName: string,
  callerEmoji: string,
  chatId: string
): Promise<void> {
  await sendPushNotification(
    recipientId,
    `${callerEmoji} ${callerName}`,
    "Incoming call...",
    { type: "call", chatId }
  );
}

export async function sendCommentNotification(
  postOwnerId: string,
  commenterName: string,
  commenterEmoji: string,
  commentPreview: string,
  postId: string
): Promise<void> {
  const truncatedComment = commentPreview.length > 50 
    ? commentPreview.substring(0, 50) + "..." 
    : commentPreview;
    
  await sendPushNotification(
    postOwnerId,
    `${commenterEmoji} ${commenterName} commented`,
    truncatedComment,
    { type: "comment", postId }
  );
}
