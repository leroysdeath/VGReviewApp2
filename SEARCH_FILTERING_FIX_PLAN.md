# Search Results Filtering Fix - Action Plan

## Problem Statement
Popular game titles including Grand Theft Auto, Pokemon, and Mario games are being filtered out of search results due to overly aggressive content protection filtering. Analysis shows that legitimate games are being blocked by blanket category filtering and strict name-based rules.

## Root Causes Identified
1. **Category Blocking**: Collections (3), Remasters (9), Ports (11), and Packs (13) are completely filtered
2. **Collection Name Filtering**: Games with "Definitive Edition", "Collection", etc. are blocked
3. **Franchise Protection Misapplied**: Official games getting filtered by their own company's copyright level
4. **Incomplete Company Lists**: Missing publisher/developer variants causing misidentification

## Action Plan

### Phase 1: Immediate Critical Fixes (Fix Category Blocking)

#### 1. Replace Blanket Category Filtering
**File**: `/src/services/contentProtectionFilter.ts`
**Lines**: ~1097-1125
**Change**: Replace hard `return false` for categories with quality-based checks
**Impact**: Unblocks popular collections, remasters, and ports

```typescript
// Instead of blocking all category 3/9/11/13
// Check quality metrics first:
// - Rating > 70 OR
// - Followers > 1000 OR
// - Rating count > 50
// Then allow through
```

#### 2. Fix Collection Name Filtering
**File**: `/src/services/contentProtectionFilter.ts`
**Lines**: ~1156-1168
**Change**: Only filter collections if BOTH name indicator AND low quality
**Impact**: Unblocks "Grand Theft Auto: The Trilogy - Definitive Edition"

### Phase 2: Fix Franchise Filtering Logic

#### 3. Fix Official Company Detection
**File**: `/src/services/contentProtectionFilter.ts`
**Change**: Don't apply aggressive franchise filtering to official company games
**Impact**: Prevents Nintendo games from being blocked by Nintendo's copyright level

#### 4. Expand Official Companies List
**File**: `/src/services/contentProtectionFilter.ts`
**Add Companies**:
- Nintendo variants: "nintendo co ltd", "nintendo of america", "nintendo of europe"
- Pokemon: "game freak", "the pokemon company", "creatures inc"
- Rockstar: "rockstar games", "rockstar north", "rockstar san diego"
- Add fuzzy matching for company name variations

### Phase 3: Enhance Search Coverage

#### 5. Update IGDB Query Building
**File**: `/src/services/igdbService.ts`
**Change**: Ensure all necessary fields are requested
**Add Fields**: `version_parent`, `parent_game`, `involved_companies.company.name`

#### 6. Add Quality Override System
**Logic**: Games with high metrics bypass most filters
- Rating > 70 OR
- Followers > 1000 OR
- Rating count > 50
**Impact**: Popular games always appear regardless of category

### Phase 4: Testing & Validation

#### 7. Create Test Searches
**Test Queries**:
- "Grand Theft Auto" → Should show III, Vice City, San Andreas, IV, V, Definitive Edition
- "Pokemon" → Should show main series from Red/Blue through Scarlet/Violet
- "Mario" → Should show Odyssey, 3D All-Stars, Wonder, main titles

#### 8. Add Debug Logging
**Purpose**: Track what's being filtered and why
**Location**: Add to filter decision points
**Format**: `console.log('[FILTER] Blocking ${game.name}: ${reason}')`

## Expected Outcomes

### Before Fix
- "Grand Theft Auto": 9 results (missing major titles)
- "Pokemon": Limited results (missing main series)
- "Mario": Missing collections and remasters

### After Fix
- "Grand Theft Auto": All mainline games including collections
- "Pokemon": Full main series catalog
- "Mario": Complete catalog including 3D All-Stars

## Implementation Priority

### CRITICAL (Immediate)
1. Fix category filtering (Phase 1, items 1-2)
2. Fix official company bypass (Phase 2, item 3)

### HIGH (Next)
3. Expand companies list (Phase 2, item 4)
4. Add quality override (Phase 3, item 6)

### MEDIUM (Follow-up)
5. Enhanced query building (Phase 3, item 5)
6. Testing and logging (Phase 4, items 7-8)

## Files to Modify
1. `/src/services/contentProtectionFilter.ts` - Main filtering logic (90% of changes)
2. `/src/services/igdbService.ts` - Query enhancements (10% of changes)
3. `/src/services/advancedSearchCoordination.ts` - Ensure uses updated logic

## Success Metrics
- Grand Theft Auto search returns 15+ results (up from 9)
- Pokemon search returns main series games
- Mario search includes collections like 3D All-Stars
- No legitimate high-rated games filtered out
- Low-quality fan content still filtered appropriately

## Risk Mitigation
- Changes are backwards compatible
- Quality thresholds ensure spam/low-quality content still filtered
- Official company detection prevents filtering legitimate games
- Debug logging helps identify any remaining issues