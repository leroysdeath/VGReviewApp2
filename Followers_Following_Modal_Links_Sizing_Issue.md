# Followers/Following Modal Links Sizing Issue

## Problem
The "FOLLOWING" and "FOLLOWERS" text labels in the ProfileDetails component do not fit properly within their bordered containers. These labels are longer than "GAMES" and "REVIEWS", causing overflow issues.

## Proposed Solutions

### Option 1: Abbreviate the Text (Recommended)
**Implementation:** Change the labels to shorter alternatives
- "FOLLOWING" → "FOLLOWS"
- "FOLLOWERS" → "FANS" or keep "FOLLOWERS"

**Pros:**
- Simplest solution
- Maintains current compact layout
- Consistent with social platform conventions
- No layout changes required

**Cons:**
- Slight change in terminology

### Option 2: Adjust Container Widths
**Implementation:** Make Following/Followers columns wider
- Use `grid-cols-[1fr_1fr_1fr_1.2fr_1.2fr]` to give those columns more space
- Adjust grid template columns to accommodate longer text

**Pros:**
- Keeps original text intact
- No abbreviation needed

**Cons:**
- Creates uneven column widths
- May look visually unbalanced
- Could affect responsive behavior

### Option 3: Reduce Font Size for Longer Labels
**Implementation:** Different font sizes based on text length
- Keep "GAMES" and "REVIEWS" at current size (`text-[10px]`)
- Make "FOLLOWING" and "FOLLOWERS" smaller (`text-[9px]`)

**Pros:**
- All text fits without layout changes
- Preserves original labels

**Cons:**
- Inconsistent text sizes
- May reduce readability
- Breaks visual consistency

### Option 4: Stack Layout on Smaller Screens
**Implementation:** Responsive grid changes
- Use responsive classes to stack into 2 rows of 3 on mobile
- Example: `grid-cols-3 sm:grid-cols-5`

**Pros:**
- More breathing room for all elements
- Better mobile experience
- No text changes needed

**Cons:**
- Changes overall layout structure
- Takes up more vertical space
- May require additional responsive adjustments

### Option 5: Remove Horizontal Padding
**Implementation:** Reduce padding for specific buttons
- Change `p-2` to `p-1` or `px-1 py-2` for Following/Followers only
- Keep standard padding for other buttons

**Pros:**
- Minimal visual impact
- Quick fix

**Cons:**
- Creates inconsistent spacing
- Text may feel cramped
- Doesn't fully solve the problem on all screen sizes

## Recommendation
**Option 1 (Abbreviate the Text)** is the recommended solution because:
1. It's the cleanest approach with minimal code changes
2. "FOLLOWS" is commonly used in social platforms and remains clear
3. Maintains design consistency across all buttons
4. No layout or responsive behavior changes needed
5. Preserves visual balance and readability

## Implementation Example (Option 1)
```tsx
// Change in ProfileDetails.tsx
<div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide group-hover:text-[#FF6B9D] transition-colors text-center">
  FOLLOWS
</div>
```