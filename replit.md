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
- **Users**: username, 4-digit PIN, emoji avatar
- **Posts**: image URL, optional location data (name, lat/long)
- **Likes/Saves**: user-post relationships
- **Comments**: text content on posts
- **Chats/Messages**: direct messaging between users
- **Sessions**: device-based auth sessions
- **Notifications**: activity alerts

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