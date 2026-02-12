# Okeno - Social Media App

## Overview

Okeno is a mobile-first social media application built with React Native (Expo) and a Node.js/Express backend. The app enables users to share photo-based posts with location tagging, engage through likes and comments, and communicate via direct messaging. Authentication uses a simple username + 4-digit PIN system with emoji avatars.

## User Preferences

Preferred communication style: Simple, everyday language.
Design priorities: Stability, optimization, smooth performance, minimalist Telegram-style UI.

## System Architecture

### Frontend Architecture
- **Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation with native stack navigators and bottom tabs
- **State Management**: TanStack React Query for server state, React Context for auth state
- **UI Approach**: Dark-themed "liquid glass" aesthetic with blur effects and subtle animations
- **Key Libraries**: 
  - Reanimated for animations
  - FlashList for performant lists
  - expo-image for optimized image handling
  - react-native-keyboard-controller for keyboard-aware inputs

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Style**: RESTful JSON endpoints under `/api/` prefix
- **Schema Location**: Shared between client and server in `shared/schema.ts`

### Path Aliases
- `@/` maps to `./client/` (frontend code)
- `@shared/` maps to `./shared/` (shared types and schemas)

### Data Models
Core entities defined in Drizzle schema:
- **Users**: username, 4-digit PIN, emoji avatar, isAdmin, isVerified, isBanned
- **Posts**: image URL, optional location data (name, lat/long), feeling emoji
- **Likes/Saves**: user-post relationships
- **Comments**: text content on posts
- **Chats/Messages**: direct messaging and group chats between users
- **GroupChatMembers**: membership tracking for group chats (role: admin/member)
- **Sessions**: device-based auth sessions
- **Notifications**: activity alerts

### Admin System
- Main admin: User ID `36277fd7-5211-4715-9411-4401ea120d88`
- Admin panel accessible via shield icon in profile header (only visible to admins)
- Admins can: ban/unban users, verify/unverify users, grant/revoke admin rights
- Verified users display a blue checkmark badge next to their username

**Emergency Admin SQL** (run in database console if needed):
```sql
UPDATE users SET is_admin = true, is_verified = true WHERE id = 'USER_ID_HERE';
```

### Group Chat Management
- Group chat info screen: Accessible by tapping the avatar/header in a group chat (GroupChatInfoScreen)
- Shows: group emoji, name, member count, full member list, media tabs (Photos/Voice/Links)
- Members can be tapped to view their profile
- Group edit modal: accessible via swipe-to-edit on group chats in chat list
  - Edit group name and emoji
  - View and kick members (admin only)
  - Add new members from contacts (admin only) with search
- API: `GET /api/chats/:id/media?type=photos|voice|links` - fetch shared media from a chat

### Authentication Flow
1. Register with username + 4-digit PIN → server assigns random emoji
2. Login with user ID + PIN → creates session
3. Sessions stored in AsyncStorage on device
4. No passwords - PIN-based system only

## External Dependencies

### Database
- **PostgreSQL**: Primary data store via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations in `./migrations` folder

### Expo Services
- Camera and media library for photo capture
- Location services for geotagging posts
- Haptic feedback for interactions
- Clipboard for sharing user IDs
- Push notifications via Expo's push service

### Push Notifications System
- **Database**: `push_tokens` table stores device tokens per user
- **Backend**: Notifications sent via Expo Push API (`https://exp.host/--/api/v2/push/send`)
- **Client**: Automatic permission request and token registration on login
- **Triggers**: New messages, likes, and comments send push notifications
- **Important**: Push notifications only work on physical devices (not simulators)
- **Note**: Push notifications require EAS project ID - will work after `eas build`, not in Expo Go development mode without proper EAS configuration

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required)
- `EXPO_PUBLIC_DOMAIN`: API server domain for client requests
- `REPLIT_DEV_DOMAIN`: Development server domain (Replit-specific)

### Build & Development
- Development: `npm run expo:dev` (Expo) + `npm run server:dev` (Express)
- Database sync: `npm run db:push` (Drizzle Kit push)
- Production build: `npm run expo:static:build` + `npm run server:build`

---

## Apple App Store Submission Checklist

### Content Rating
- **Age Rating**: 17+ (contains user-generated content)
- **Content Flags**: Unrestricted Web Access, User-Generated Content

### App Store Connect Metadata
- **App Name**: Okeno
- **Bundle ID**: com.moments.app
- **Primary Category**: Social Networking
- **Secondary Category**: Photo & Video

### Required App Store Connect Info
1. **Privacy Policy URL**: https://skaisay.github.io/Okeno-App-Privacy/
2. **Support URL**: https://discord.gg/FRAZ6PBcH9
3. **Marketing URL**: (optional)

### App Review Notes (Demo Credentials)
```
Username: reviewer
PIN: 1234

Login supports both username and User ID.
User ID (alternative): 3565e11b-5a6b-41d0-8973-028383b27c92

To test features:
1. Create posts using the camera or photo library
2. Like/comment on posts in the feed
3. Search users and start chats
4. Report/Block users from their profile (3-dot menu)
5. View Privacy Policy in Settings
6. Delete account in Settings (bottom of page)
```

### Compliance Status

| Requirement | Status | Location |
|-------------|--------|----------|
| Report button on posts | Done | FeedScreen.tsx, PostDetailScreen.tsx |
| Report button on profiles | Done | UserProfileScreen.tsx |
| Block button on profiles | Done | UserProfileScreen.tsx |
| Privacy Policy in-app | Done | PrivacyPolicyScreen.tsx |
| Privacy Policy link | Done | https://skaisay.github.io/Okeno-App-Privacy/ |
| Account deletion flow | Done | SettingsScreen.tsx |
| Age restriction (18+) | Done | RegisterScreen.tsx |
| Support contact info | Done | messaconfirmation@gmail.com |
| Content moderation | Done | Reports processed within 24h |
| No third-party tracking | Done | No analytics/ads SDKs |
| No AI data sharing | Done | No AI features |
| Privacy manifests | Done | app.json (privacyManifests) |
| Encryption compliance | Done | ITSAppUsesNonExemptEncryption: false |

### iOS Privacy Manifest (app.json)
- NSPrivacyTracking: false
- No tracking domains
- Camera: App functionality only
- Location: App functionality only
- Photo Library: App functionality only

### Permission Descriptions (app.json)
- NSCameraUsageDescription: Capture photos and videos
- NSPhotoLibraryUsageDescription: Select photos to share
- NSPhotoLibraryAddUsageDescription: Save photos to library
- NSLocationWhenInUseUsageDescription: Tag posts with location
- NSMicrophoneUsageDescription: Record audio in videos

### Before Submission
1. Create EAS build: `eas build --platform ios`
2. Submit to App Store: `eas submit --platform ios`
3. Complete age rating questionnaire in App Store Connect
4. Add app previews and screenshots
5. Fill in localized descriptions (EN/RU)

### Known Limitations
- No in-app purchases (free app)
- No push notifications yet
- No background location tracking
- **App Name**: Display name is "Okeno" (matching App Store listing). Bundle identifier remains `com.moments.app` (must not change after initial submission).

### Image Upload System
- Images are uploaded as base64 to the `/api/upload` endpoint
- Server saves images to the `uploads/` directory and serves them statically
- This ensures images work in production TestFlight builds (not just local development)
- Max upload size: 50MB
- Images stored on server filesystem (consider cloud storage for production scaling)

### Offline Support
- TanStack React Query with AsyncStorage persistence
- Data cached for 7 days for offline viewing
- `networkMode: 'offlineFirst'` prioritizes cached data when offline
- Images must be online to load (no local image caching yet)
- **SQLite Limitation**: expo-sqlite is only available on native iOS/Android devices. On web platform (including Replit webview), SQLite operations are gracefully skipped and the app uses network-only mode. This is handled automatically in `client/lib/database.ts` and `client/lib/sync.ts`.

### Feed Pagination
- Feed uses infinite scroll with 10 posts per page
- Manual pagination with `useQuery` + state (useInfiniteQuery has issues with React 19 + React Compiler)
- Posts load more at 50% scroll threshold
- Server API accepts `limit` and `offset` query parameters

### Debug Console
- Accessible via long-press on profile header (3s press)
- Available commands: `diag`, `system_info`, `clear`, `help`
- Color-coded output (green for success, red for errors, yellow for warnings)
- Secret admin elevation command not shown in help menu

### Image Handling
- Invalid URL types (`file://`, `blob:`) are filtered and show placeholder
- Old posts with local device paths display image placeholder icon
- Images from old development domains are rewritten to current domain
- All image components handle empty URLs gracefully with fallback UI

### URL Routes & Social Sharing
- `/u/username` - User profile landing pages (requires deployment)
- `/post/:id` - Post detail landing pages (requires deployment)
- Landing pages work in development but require publishing for custom domain

### Open Graph / Link Previews
- All shared links display rich previews in Telegram, WhatsApp, iMessage, etc.
- Dynamic OG meta tags populated based on route:
  - **Main page**: Shows app icon with "Okeno" title
  - **User profiles** (`/u/username`): Shows user's emoji + username
  - **Posts** (`/post/:id`): Shows post image (if valid), author emoji + name, location
- OG image defaults to `/assets/images/icon.png` when no specific image available
- Twitter Card meta tags also included for Twitter/X compatibility
