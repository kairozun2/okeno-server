# Moments - Social Media App

## Overview

Moments is a mobile-first social media application built with React Native (Expo) and a Node.js/Express backend. The app enables users to share photo-based posts with location tagging, engage through likes and comments, and communicate via direct messaging. Authentication uses a simple username + 4-digit PIN system with emoji avatars.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Posts**: image URL, optional location data (name, lat/long)
- **Likes/Saves**: user-post relationships
- **Comments**: text content on posts
- **Chats/Messages**: direct messaging between users
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
- **App Name**: Moments
- **Bundle ID**: com.moments.app
- **Primary Category**: Social Networking
- **Secondary Category**: Photo & Video

### Required App Store Connect Info
1. **Privacy Policy URL**: https://skaisay.github.io/App-Privacy/
2. **Support URL**: https://discord.gg/FRAZ6PBcH9
3. **Marketing URL**: (optional)

### App Review Notes (Demo Credentials)
```
Username: reviewer
User ID: (create a test account and provide ID)
PIN: 1234

To test features:
1. Create posts using the camera or photo library
2. Like/comment on posts in the feed
3. Search users and start chats
4. Report/Block users from their profile (3-dot menu)
5. View Privacy Policy in Settings
6. Delete account in Settings (bottom of page)
```

### Compliance Status ✅

| Requirement | Status | Location |
|-------------|--------|----------|
| Report button on posts | ✅ | FeedScreen.tsx, PostDetailScreen.tsx |
| Report button on profiles | ✅ | UserProfileScreen.tsx |
| Block button on profiles | ✅ | UserProfileScreen.tsx |
| Privacy Policy in-app | ✅ | PrivacyPolicyScreen.tsx |
| Privacy Policy link | ✅ | https://skaisay.github.io/App-Privacy/ |
| Account deletion flow | ✅ | SettingsScreen.tsx |
| Age restriction (18+) | ✅ | RegisterScreen.tsx |
| Support contact info | ✅ | messaconfirmation@gmail.com |
| Content moderation | ✅ | Reports processed within 24h |
| No third-party tracking | ✅ | No analytics/ads SDKs |
| No AI data sharing | ✅ | No AI features |
| Privacy manifests | ✅ | app.json (privacyManifests) |
| Encryption compliance | ✅ | ITSAppUsesNonExemptEncryption: false |

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