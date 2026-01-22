# Design Guidelines: Social Media Application

## Brand Identity
**Purpose**: A modern social media platform for content sharing and user interaction with emphasis on visual content and real-time communication.

**Aesthetic Direction**: Bold/striking with organic softness - high contrast dark mode with vibrant accent colors, dramatic full-screen experiences, and modern iOS sheet presentations for focused interactions.

**Memorable Element**: Seamless transitions between full-screen immersive content and focused modal interactions using native iOS sheets.

## Navigation Architecture

**Root Navigation**: Tab Bar (4 tabs)
- Home (Feed)
- Search/Explore
- Chats
- Profile

**Core Action**: Create/Post (Floating Action Button)

**Modal Presentations**: All secondary actions use modern iOS sheet presentations:
- User profiles (viewing others)
- Settings
- Category selection
- Comment threads
- Search filters
- Notifications panel

## Screen-by-Screen Specifications

### Home Feed (Tab 1)
- **Layout**: Full screen scrollable grid/list
- **Header**: Transparent with app logo, right: notifications button
- **Safe Area**: Top: headerHeight + Spacing.xl, Bottom: tabBarHeight + Spacing.xl
- **Components**: Content cards in grid, pull-to-refresh
- **Empty State**: empty-feed.png illustration

### Search/Explore (Tab 2)
- **Layout**: Full screen with search bar in header
- **Header**: Large search input, category filters
- **Safe Area**: Top: headerHeight + Spacing.xl, Bottom: tabBarHeight + Spacing.xl
- **Components**: Search results grid, trending sections
- **Empty State**: empty-search.png illustration

### Chats List (Tab 3)
- **Layout**: Full screen list
- **Header**: Default navigation, right: new chat button
- **Safe Area**: Top: headerHeight + Spacing.xl, Bottom: tabBarHeight + Spacing.xl
- **Components**: Chat preview cells with avatars, timestamps
- **Empty State**: empty-chats.png illustration

### Profile (Tab 4)
- **Layout**: Full screen scrollable
- **Header**: Transparent, right: settings button
- **Safe Area**: Top: insets.top + Spacing.xl, Bottom: tabBarHeight + Spacing.xl
- **Components**: User avatar, bio, content grid, stats
- **Empty State**: empty-profile.png illustration

### Modals (Sheet Presentations)
- Other User Profile: Medium detent sheet
- Settings: Large sheet with list
- Category Picker: Medium sheet with grid
- Comments: Large sheet with scrollable list
- Notifications: Medium sheet

## Color Palette
- **Primary**: #FF4B6E (vibrant pink-red)
- **Background**: #000000 (pure black for OLED)
- **Surface**: #1C1C1E (elevated surface)
- **Text Primary**: #FFFFFF
- **Text Secondary**: #8E8E93
- **Border**: #2C2C2E

## Typography
- **Font**: SF Pro (system)
- **Title Large**: 34pt Bold
- **Title**: 28pt Bold
- **Headline**: 17pt Semibold
- **Body**: 17pt Regular
- **Caption**: 13pt Regular

## Assets to Generate
1. **icon.png** - App icon with gradient pink-red theme
2. **splash-icon.png** - Launch screen icon
3. **empty-feed.png** - USED: Home tab when no content
4. **empty-search.png** - USED: Search tab before/after search
5. **empty-chats.png** - USED: Chats tab when no conversations
6. **empty-profile.png** - USED: Profile tab for new users
7. **avatar-1.png** to **avatar-5.png** - Default user avatars