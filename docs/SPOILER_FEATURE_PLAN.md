# Spoiler Warning Feature Implementation Plan

## Overview
Implementation plan for adding an optional "Review contains spoilers" checkbox to the review form, with corresponding warning displays on review pages.

## Current State Analysis ✅

### Database
- **Status**: `is_spoiler` column already exists in the `rating` table
- **Default Value**: `false`
- **Type**: `boolean`
- **No migration needed** - we can proceed directly to implementation

### Key Files
- **Review Form**: `src/pages/ReviewFormPage.tsx`
  - Currently handles: rating, review text, recommendation, completion status, platforms
  - Lines: ~1,223

- **Review Display**: `src/pages/ReviewPage.tsx`
  - Displays full review details with comments
  - Lines: ~662

- **Review Service**: `src/services/reviewService.ts`
  - Handles all CRUD operations for reviews
  - Lines: ~1,635

## Implementation Steps

### 1. ReviewFormPage Updates
**Location**: `src/pages/ReviewFormPage.tsx`

#### Tasks:
- Add state: `const [containsSpoilers, setContainsSpoilers] = useState(false)`
- Add checkbox UI below review textarea (around line 1095)
- Include in form validation and submission
- Handle edit mode - load existing `is_spoiler` value
- Update both `createReview` and `updateReview` calls

#### UI Placement:
```tsx
// After review text area (line ~1095)
<div>
  <label className="flex items-center gap-2 text-sm text-gray-300">
    <input
      type="checkbox"
      checked={containsSpoilers}
      onChange={(e) => setContainsSpoilers(e.target.checked)}
      className="..."
    />
    <span>This review contains spoilers</span>
  </label>
</div>
```

### 2. Review Service Updates
**Location**: `src/services/reviewService.ts`

#### Tasks:
- Modify `createReview()` function signature (line ~215):
  - Add parameter: `containsSpoilers?: boolean`
  - Include in insert data: `is_spoiler: containsSpoilers || false`

- Modify `updateReview()` function signature (line ~598):
  - Add parameter: `containsSpoilers?: boolean`
  - Include in update data: `is_spoiler: containsSpoilers`

- Update `Review` interface (line ~418):
  - Add field: `isSpoiler?: boolean`

### 3. ReviewPage Spoiler Warning UI
**Location**: `src/pages/ReviewPage.tsx`

#### Design Approach:
- Collapsible warning banner at the top of spoiler reviews
- Hide review text initially behind "Show spoiler review" button
- Clear visual indicators (warning icon, amber/yellow colors)

#### Implementation:
```tsx
// Add state for spoiler visibility
const [showSpoilerContent, setShowSpoilerContent] = useState(false);

// Conditional rendering for review text
{review.is_spoiler && !showSpoilerContent ? (
  <SpoilerWarning onReveal={() => setShowSpoilerContent(true)} />
) : (
  <ReviewContent text={reviewText} />
)}
```

### 4. Review Cards/Lists Updates
**Locations**:
- Review cards in game pages
- User profile review lists
- Homepage recent reviews

#### Tasks:
- Add spoiler badge/indicator to review cards
- Blur or hide preview text for spoiler reviews
- Add warning tooltips on hover

## UI/UX Design Specifications

### Spoiler Checkbox (ReviewFormPage)
- **Label**: "This review contains spoilers"
- **Position**: Below review textarea, above submit buttons
- **Styling**: Clear but not overly prominent
- **Icon**: Optional warning triangle icon

### Spoiler Warning (ReviewPage)
- **Color Scheme**: Amber/yellow (warning colors)
- **Icons**: Eye-off icon (hidden), Alert triangle (warning)
- **Text**: "⚠️ Spoiler Warning: This review contains spoilers"
- **Action**: "Click to reveal spoiler content" button
- **Animation**: Smooth reveal transition

### Spoiler Indicators (Lists/Cards)
- **Badge**: Small "SPOILER" badge in corner
- **Text Treatment**: Blurred or replaced with "Hidden due to spoilers"
- **Hover State**: Tooltip explaining spoiler protection

## Technical Implementation Details

### State Management
- Form: Local state for checkbox
- Review display: Local state for reveal/hide
- No global state needed - spoiler flag travels with review data

### Database Operations
- **Create**: Include `is_spoiler` in INSERT
- **Read**: Fetch `is_spoiler` with review data
- **Update**: Include `is_spoiler` in UPDATE
- **Delete**: No special handling needed

### Performance Considerations
- No additional API calls needed
- Minimal DOM manipulation (show/hide)
- CSS blur effects are GPU-accelerated

## Testing Checklist

### Unit Tests
- [ ] Checkbox state management
- [ ] Form submission with spoiler flag
- [ ] Review service with spoiler parameter
- [ ] Spoiler warning component rendering

### Integration Tests
- [ ] Create review with spoiler flag
- [ ] Edit review to add/remove spoiler flag
- [ ] Display spoiler warning on ReviewPage
- [ ] Spoiler indicators in review lists

### Manual Testing
- [ ] Create new review with spoiler
- [ ] Edit existing review to add spoiler
- [ ] View spoiler review (test warning)
- [ ] Check spoiler indicators in all views
- [ ] Mobile responsive design
- [ ] Accessibility (keyboard navigation, screen readers)

## Benefits

1. **No Database Migration**: Field already exists, ready to use
2. **User Control**: Authors mark spoilers, readers choose to view
3. **Non-Breaking**: Optional feature, doesn't affect existing reviews
4. **Clear UX**: Obvious warnings prevent accidental spoilers
5. **Consistent**: Same indicators across all review displays

## Rollback Plan
If issues arise:
1. Set `is_spoiler` default to `false` for all new reviews
2. Hide spoiler UI elements via feature flag
3. Existing data remains intact (non-destructive)

## Future Enhancements
- User preference to auto-show/hide all spoilers
- Spoiler sections within reviews (partial spoilers)
- Game-specific spoiler settings
- Spoiler statistics and filtering

## Timeline Estimate
- ReviewFormPage updates: 1 hour
- Review service updates: 30 minutes
- ReviewPage warning UI: 1.5 hours
- Review cards/lists: 1 hour
- Testing and refinement: 1 hour
- **Total: ~5 hours**

## Notes
- Database column `is_spoiler` discovered during analysis
- No migration needed - proceed directly to implementation
- Consider A/B testing the warning UI design
- Monitor user adoption and feedback
