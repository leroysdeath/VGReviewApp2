# Dynamic Platforms Analysis for ReviewFormPage

## Overview
This document outlines the analysis and implementation steps for changing the ReviewFormPage platform selection from static checkboxes to dynamic platforms based on the selected game.

## Current vs. Desired State

**Current**: Static platform checkboxes (`['PS5', 'Xbox Series X/S', 'Nintendo Switch', 'PC', 'Retro']`)

**Desired**: Dynamic platform checkboxes based on the selected game's available platforms

## Implementation Steps

### 1. Data Source Investigation
- **Check game.platforms field**: The `game` table has a `platforms TEXT[]` field that should contain platform data
- **Verify platform data quality**: Need to ensure games in the database have accurate platform information
- **Fallback strategy**: Decide what to show if a game has no platform data

### 2. State Management Updates
- **Add new state**: `availablePlatforms: string[]` to store the game's platforms
- **Modify existing state**: `selectedPlatforms` logic to reset when game changes
- **Loading state**: Consider adding platform loading state for UX

### 3. Data Flow Changes
- **Game selection trigger**: When `selectedGame` changes, fetch/extract platform data
- **Platform extraction**: Parse the `game.platforms` array from the selected game
- **Platform mapping**: May need to normalize platform names (e.g., "PlayStation 5" → "PS5")

### 4. UI Logic Updates
- **Dynamic rendering**: Replace static platform array with `availablePlatforms`
- **Validation updates**: Ensure at least one platform is selected from available options
- **Empty state handling**: What to show if game has no platforms listed
- **Reset behavior**: Clear selected platforms when changing games

### 5. Edge Cases to Handle
- **No platform data**: Show default platforms or disable form submission?
- **Platform name inconsistencies**: IGDB might use different naming conventions
- **Legacy reviews**: How to handle existing reviews with platforms not in the new game's list?
- **Game without platforms**: Some games might not have platform data populated

### 6. Potential Challenges
- **Data quality**: Platform data in the database might be incomplete or inconsistent
- **Platform name mapping**: IGDB platform names might not match your UI display names
- **Backwards compatibility**: Existing reviews might reference platforms not available for re-selection

### 7. User Experience Considerations
- **Auto-selection**: Should previously selected platforms remain checked if still available?
- **Platform ordering**: How to order the dynamic platforms (alphabetical, popularity, etc.)?
- **Visual feedback**: Show loading state while fetching platform data

## Technical Implementation Notes

### Files to Modify
- `src/pages/ReviewFormPage.tsx` - Main component logic
- Potentially `src/services/gameDataService.ts` - If platform data needs processing

### Database Schema Reference
- `game.platforms TEXT[]` - Contains array of platform names
- `rating` table - Stores review data including platform selection

### Key Considerations
- Maintain requirement that at least one platform must be selected
- Ensure smooth user experience during game selection changes
- Handle cases where platform data is missing or inconsistent
- Consider performance implications of additional data fetching

## Next Steps
1. Investigate current platform data quality in the database
2. Design platform name mapping strategy
3. Implement dynamic platform loading logic
4. Update UI components and validation
5. Test edge cases and user experience flows