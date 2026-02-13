# Okeno - Social Media App

## Overview
Okeno is a mobile-first social media application built with React Native (Expo) and a Node.js/Express backend. It enables users to share photo-based posts with location tagging, engage through likes and comments, and communicate via direct messaging. The app features a simple username + 4-digit PIN authentication system with emoji avatars and incorporates a premium subscription model. The project aims for a stable, optimized, and performant social media experience with a minimalist UI, targeting a broad user base with its intuitive design and core social functionalities.

## User Preferences
Preferred communication style: Simple, everyday language. Always respond in Russian.
Design priorities: Stability, optimization, smooth performance, minimalist Telegram-style UI.

## System Architecture

### Frontend
- **Framework**: React Native with Expo SDK 54, utilizing React Navigation for navigation and TanStack React Query for server state management.
- **UI/UX**: Dark-themed "liquid glass" aesthetic with blur effects, subtle animations via Reanimated, optimized image handling with `expo-image`, and performant lists using FlashList.
- **Offline Support**: TanStack React Query configured for offline-first operation with AsyncStorage persistence, intelligent retry mechanisms, and graceful fallback for unavailable network resources. SQLite operations are platform-aware, skipping on web.
- **Features**: Interactive Map Modal for location-tagged posts, QR Code login, Saved Messages (personal cloud storage), Debug Console for diagnostics, and dynamic Open Graph/Link Previews for social sharing.
- **Accessibility**: Implements a report/block system, in-app privacy policy, and account deletion flow for user safety and data control.

### Backend
- **Runtime**: Node.js with Express 5, using Drizzle ORM and PostgreSQL for data persistence.
- **API**: RESTful JSON endpoints with shared schema between client and server.
- **Security**: Implements Helmet headers, in-memory rate limiting, and input sanitization.
- **Performance**: Optimized database queries with comprehensive indexing and connection pooling, gzip/deflate response compression, and efficient feed/chat list queries.
- **User Management**: Features user authentication (username + 4-digit PIN), session management, and an admin system for user/group/mini-app moderation (ban/unban, verify/unverify, grant/revoke admin rights).
- **Premium System**: Integrated with Stripe for managing premium subscriptions, offering features like profile effects, HD uploads, and custom username colors.
- **Content Management**: Supports photo-based posts with location data, comments, likes, saves, direct messaging, and group chats with media sharing capabilities.
- **Mini Apps**: A Telegram-like mini-app system allowing users to create and manage web-based applications within the platform, which can be verified by admins.
- **Push Notifications**: Backend support for sending push notifications via Expo Push API for new messages, likes, and comments.

### Data Models
Key entities include Users, Posts, Likes/Saves, Comments, Chats/Messages, GroupChatMembers, Sessions, Notifications, SavedMessages, LoginTokens, and MiniApps.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.
- **Drizzle Kit**: Used for database migrations.

### Expo Services
- Camera, media library, location services, haptic feedback, clipboard, and push notifications (via Expo's push service).

### Third-party Integrations
- **Stripe**: For premium subscription management (checkout, billing portal, webhooks).

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string.
- `EXPO_PUBLIC_DOMAIN`: API server domain for client.
- `REPLIT_DEV_DOMAIN`: Development server domain (Replit-specific).