# User Table Analysis: `name`, `username`, and `display_name` Columns

## Table Structure
- **`name`**: `varchar NOT NULL` - Required field
- **`username`**: `varchar NULL` - Optional, has unique constraint  
- **`display_name`**: `varchar NULL` - Optional field

## Usage Analysis

### 1. **`name` Column Function**
- **Primary Purpose**: Fallback/legacy compatibility field
- **Usage Pattern**: Used as a fallback when `username` is missing
- **Key Locations**:
  - `userFieldMapping.ts:26`: `username: dbUser.username || dbUser.name || ''`
  - `UserSearchPage.tsx:221`: `username: user.username || user.name || 'Anonymous'`
  - Database triggers: Used for initial user creation from auth metadata
  - **Backwards compatibility**: `dbData.name = formData.username` (line 48 in userFieldMapping.ts)

### 2. **`username` Column Function**  
- **Primary Purpose**: Unique identifier for URLs, mentions, and public display
- **Usage Pattern**: Primary identifier used throughout the UI
- **Key Locations**:
  - **URLs**: Used in profile routes and links
  - **Activity feeds**: User identification in all activity items 
  - **Search functionality**: Primary search field for finding users
  - **UI Display**: Primary display name in most components
  - **Database constraint**: Has unique index for URL routing

### 3. **`display_name` Column Function**
- **Primary Purpose**: Optional "pretty name" for UI display
- **Usage Pattern**: Rarely used - only in profile settings and one display location
- **Key Locations**:
  - `UserProfileCard.tsx:136`: `{profile.displayName || profile.username}` - **Only UI usage**
  - Profile settings forms: User can edit this field
  - **Minimal adoption**: Most components ignore this field entirely

## **Consolidation Recommendation: REMOVE `display_name`**

### Why `display_name` Should Be Removed:

1. **Minimal Usage**: Only used in ONE component (`UserProfileCard`) and completely ignored elsewhere
2. **User Confusion**: Having both `username` and `display_name` creates UX confusion about which name appears where
3. **Inconsistent Display**: Most of the app shows `username`, only profile cards show `display_name || username`
4. **Code Complexity**: Adds unnecessary field mapping and form handling
5. **Database Simplification**: Reduces schema complexity with no functional loss

### Why Keep `name` and `username`:

1. **`username`** - Essential for:
   - URL routing (`/profile/username`)
   - Unique identification
   - User search and mentions
   - Primary UI display

2. **`name`** - Necessary for:
   - Backwards compatibility with existing data
   - Auth trigger fallbacks when username generation fails
   - Database migration safety

### **Recommended Actions:**

1. **Remove `display_name` column** from user table
2. **Update UserProfileCard** to just use `username`: `{profile.username}`
3. **Remove display_name from**:
   - All TypeScript interfaces
   - Form schemas and validation
   - User settings components
   - Database migrations and triggers
4. **Keep the existing `name` ↔ `username` sync** for backwards compatibility

### **Result:**
- **Simplified UX**: One clear username displayed consistently everywhere
- **Reduced Code**: Eliminate unnecessary field handling and mapping
- **Better Consistency**: Same username shown across all app components
- **Maintained Compatibility**: Keep `name` field for legacy/fallback support

The `display_name` field adds complexity without meaningful functionality since it's barely used and creates inconsistent user identity display.