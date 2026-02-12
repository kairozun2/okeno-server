import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getApiUrl } from "./query-client";
import { useSettingsStore } from "./settings-store";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const prefs = useSettingsStore.getState().notifications;
    const data = notification.request.content.data as Record<string, any> | undefined;
    const type = data?.type;

    let shouldShow = true;
    if (type === "message") {
      shouldShow = prefs?.messages !== false;
    } else if (type === "group_message") {
      shouldShow = prefs?.groupMessages !== false;
    } else if (type === "like") {
      shouldShow = prefs?.likes !== false;
    } else if (type === "comment") {
      shouldShow = prefs?.comments !== false;
    } else if (type === "call") {
      shouldShow = prefs?.calls !== false;
    }

    return {
      shouldShowAlert: shouldShow,
      shouldPlaySound: shouldShow,
      shouldSetBadge: shouldShow,
      shouldShowBanner: shouldShow,
      shouldShowList: shouldShow,
    };
  },
});

export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permission not granted");
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    
    if (!projectId) {
      console.log("Push notifications: No project ID configured. Will work after EAS build.");
      return null;
    }
    
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenData.data;

    await savePushToken(userId, token);

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    return token;
  } catch (error) {
    console.error("Error registering for push notifications:", error);
    return null;
  }
}

async function savePushToken(userId: string, token: string): Promise<void> {
  try {
    const url = new URL("/api/push-tokens", getApiUrl());
    await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        token,
        platform: Platform.OS,
      }),
    });
  } catch (error) {
    console.error("Error saving push token:", error);
  }
}

export async function unregisterPushNotifications(userId: string, token: string): Promise<void> {
  try {
    const url = new URL("/api/push-tokens", getApiUrl());
    await fetch(url.toString(), {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        token,
      }),
    });
  } catch (error) {
    console.error("Error unregistering push token:", error);
  }
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
