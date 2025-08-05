# User Page Component System

This directory contains a shared component system that keeps the User Page and Dummy User Page synchronized.

## Components

### UserPageLayout.tsx
- **Purpose**: Provides the consistent layout structure for all user pages
- **Features**: 
  - Profile header with avatar, username, bio, and stats
  - Navigation tabs
  - Responsive design
  - Support for both regular and dummy pages

### UserPageContent.tsx
- **Purpose**: Renders the content for each tab in the user page
- **Features**:
  - Profile tab with favorite games, recent activity, and reviews
  - Games tab with grid/list view options
  - Reviews tab with filtering options
  - Placeholder content for other tabs
  - Conditional content for dummy pages

## Synchronization

Any changes made to the layout or content structure will automatically be reflected in both:
- `/user/:id` (UserPage.tsx)
- `/dummy-user` (DummyUserPage.tsx)

## Usage

Both pages use the same shared components but with different data sources:
- **UserPage**: Uses real user data from URL parameters
- **DummyUserPage**: Uses hardcoded test data and shows additional dummy indicators

## Making Changes

To modify the user page layout or functionality:

1. **Layout changes**: Edit `UserPageLayout.tsx`
2. **Content changes**: Edit `UserPageContent.tsx`
3. **Data structure changes**: Update the interfaces in both components

Changes will automatically apply to both the regular and dummy user pages, ensuring they stay in sync.