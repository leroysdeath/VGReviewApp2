# User Profile Refactor Plan

## Executive Summary

Comprehensive refactoring plan to eliminate ~60% of user profile code redundancy by consolidating duplicate components and removing unnecessary abstraction layers, aligning with the project's "Pragmatic Monolith" philosophy.

## Current State Analysis

### File Inventory

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `UserPage.tsx` | 362 | Display user profiles via `/user/:id` | Keep & enhance |
| `ProfilePage.tsx` | 318 | Display current user's profile | **DELETE** |
| `UserPageContent.tsx` | 72 | Wrapper for ProfileDataWithPreview | **DELETE** |
| `ProfileDataWithPreview.tsx` | 76 | Wrapper for ProfileData | **DELETE** |
| `UserPageLayout.tsx` | 4 | Re-export of ResponsiveUserPageLayout | **DELETE** |
| `UserProfileCard.tsx` | 211 | Unused profile card component | **DELETE** |
| `profileService.ts` | 652 | Complex service layer with caching | **SIMPLIFY** |
| `ProfileData.tsx` | 1,152 | Mega-component for profile content | **SPLIT** |

**Total Lines to Remove: ~1,000+ lines (40% reduction)**

### Key Problems Identified

1. **80% code duplication** between UserPage and ProfilePage
2. **Multiple wrapper components** that only pass props without adding functionality
3. **Inconsistent ID handling** (database IDs vs auth UUIDs)
4. **Over-engineered service layer** with unnecessary caching complexity
5. **Violates project philosophy** of direct, pragmatic implementation

## Optimal Architecture

### Single Route Pattern

```typescript
// App.tsx - Single, clear route
<Route path="/user/:id" element={<UserPage />} />

// UserPage.tsx - Unified component
const UserPage = () => {
  const { id } = useParams();
  const { user: authUser } = useAuth();
  
  // Always require an ID for clarity
  if (!id) {
    return <Navigate to={`/user/${authUser?.databaseId}`} />;
  }
  
  const isOwnProfile = id === authUser?.databaseId;
  // Single data fetching and display logic
}
```

### Target File Structure

```
/src
  /pages
    UserPage.tsx         # ~400 lines - Unified profile page
    UserSettingsPage.tsx # Keep separate for settings
  /components/profile
    ProfileHeader.tsx    # ~150 lines - Merged Info+Details
    TopGames.tsx        # ~200 lines - Extracted from ProfileData
    ReviewsList.tsx     # ~150 lines - Extracted from ProfileData  
    ActivityFeed.tsx    # ~100 lines - Extracted from ProfileData
  /services
    userService.ts      # Simple, direct Supabase queries
```

## Implementation Plan

### Phase 1: Delete Redundant Files

```bash
# Remove all redundant components
rm src/pages/ProfilePage.tsx
rm src/components/UserPageContent.tsx
rm src/components/ProfileDataWithPreview.tsx
rm src/components/UserPageLayout.tsx
rm src/components/profile/UserProfileCard.tsx
```

### Phase 2: Enhance UserPage

```typescript
// Enhanced UserPage.tsx structure
export const UserPage: React.FC = () => {
  const { id } = useParams();
  const { user: authUser } = useAuth();
  
  // Redirect if no ID provided
  if (!id) {
    return <Navigate to={`/user/${authUser?.databaseId}`} replace />;
  }
  
  // Unified data fetching
  const { data: user, loading, error } = useUser(id);
  const isOwnProfile = id === authUser?.databaseId;
  
  if (loading) return <LoadingSpinner />;
  if (error) return <Navigate to="/" />;
  
  return (
    <div className="bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <ProfileHeader 
          user={user} 
          isOwnProfile={isOwnProfile}
          onEditClick={() => setShowSettings(true)}
        />
        
        <TabNavigation 
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        
        {/* Direct rendering, no wrapper components */}
        {activeTab === 'top5' && (
          <TopGames userId={id} limit={5} editable={isOwnProfile} />
        )}
        {activeTab === 'top10' && (
          <TopGames userId={id} limit={10} />
        )}
        {activeTab === 'reviews' && (
          <ReviewsList userId={id} />
        )}
        {activeTab === 'activity' && (
          <ActivityFeed userId={id} />
        )}
      </div>
    </div>
  );
};
```

### Phase 3: Simplify Service Layer

```typescript
// services/userService.ts - Direct and simple
export const userService = {
  async getUser(userId: string) {
    const { data, error } = await supabase
      .from('user')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async updateUser(userId: string, updates: UserUpdate) {
    const { data, error } = await supabase
      .from('user')
      .update(updates)
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  }
};
```

### Phase 4: Split ProfileData Mega-Component

Extract ProfileData.tsx (1,152 lines) into focused components:

- `TopGames.tsx` - Handle top 5/10 display and editing
- `ReviewsList.tsx` - User's reviews with filtering
- `ActivityFeed.tsx` - User activity timeline
- `GameLists.tsx` - User's curated lists (future feature)

Each component independently fetches its own data and manages its own state.

## Route Structure

```typescript
// Clean, RESTful routes
/user/:id       → View any user's profile (including own)
/settings       → Account settings page
/               → Home/discover page

// Navigation logic
const profileLink = `/user/${currentUser.databaseId}`;
```

## Key Decisions

### 1. Standardize on Database IDs

- Use numeric database IDs in URLs (`/user/123`)
- Store database ID in auth context on login
- Remove all UUID/provider_id conversion logic

### 2. Direct Component Composition

- No wrapper components
- Components directly in UserPage
- Props passed explicitly, no prop spreading

### 3. Simplified Data Fetching

- Use SWR or React Query for caching
- Direct Supabase calls in components
- No custom caching layer needed

## Benefits

### Code Reduction
- **~1,000+ lines removed** (40% reduction)
- **From 8 files to 5 files**
- **Single source of truth** for profile logic

### Performance
- Fewer component layers = fewer re-renders
- Smaller bundle size
- Direct data flow
- Simplified state management

### Developer Experience
- One place to update profile features
- Clear, predictable routing
- No wrapper component maze
- Follows project's pragmatic philosophy

## Migration Checklist

- [ ] Delete ProfilePage.tsx
- [ ] Delete wrapper components (UserPageContent, ProfileDataWithPreview, etc.)
- [ ] Enhance UserPage to handle all profile views
- [ ] Update all route references to use `/user/:id`
- [ ] Split ProfileData.tsx into focused components
- [ ] Simplify profileService to basic CRUD operations
- [ ] Update imports throughout codebase
- [ ] Remove profile route from App.tsx
- [ ] Test unified UserPage with own profile
- [ ] Test unified UserPage with other profiles
- [ ] Update UserSettingsPage to use simplified service

## Success Criteria

- ✅ Single UserPage component handles all profile views
- ✅ No duplicate code between own/other profile views
- ✅ Direct component composition without wrappers
- ✅ Clean `/user/:id` routing pattern
- ✅ 40%+ reduction in profile-related code
- ✅ Aligns with "Pragmatic Monolith" philosophy

## Notes

- Since the site is not live, backwards compatibility is not a concern
- Focus on cleanest possible implementation
- Follow Letterboxd/Backloggd pattern of simplicity
- Avoid premature abstraction - implement directly first