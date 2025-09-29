# Rating Color Distribution System

## Overview
This document outlines the standardized color distribution system used throughout the VGReviewApp for displaying ratings. This system provides consistent visual feedback across all components where ratings are displayed.

## Color Scale

| Rating Range | Color | Tailwind Classes | Meaning |
|-------------|-------|------------------|---------|
| 1.0 - 3.0 | Red | `bg-red-500`, `text-red-400` | Low ratings |
| 3.1 - 5.0 | Orange | `bg-orange-500`, `text-orange-400` | Mid-low ratings |
| 5.1 - 7.0 | Yellow | `bg-yellow-500`, `text-yellow-400` | Mid-high ratings |
| 7.1 - 9.5 | Green | `bg-green-500`, `text-green-400` | High ratings |
| 9.6 - 10.0 | Blue | `bg-blue-500`, `text-blue-400` | Near-perfect/Perfect ratings |

## Components Using the Color Distribution

### Core Rating Display Components

#### 1. **RatingBars.tsx** (Shared Component)
- **Location**: `/src/components/RatingBars.tsx`
- **Purpose**: Reusable bar chart visualization for rating distributions
- **Usage**: Colors individual rating bars (1-10) in distribution charts
- **Used By**: GamePage, UserPage (via UserRatingDistribution)

#### 2. **UserRatingDistribution.tsx**
- **Location**: `/src/components/profile/UserRatingDistribution.tsx`
- **Purpose**: Wrapper component for user-specific rating distributions
- **Usage**: Fetches user rating data and passes to RatingBars component
- **Displays**: Personal rating distribution for a specific user

### Page-Level Implementations

#### 3. **GamePage.tsx**
- **Location**: `/src/pages/GamePage.tsx`
- **Purpose**: Game detail page
- **Usage**: Uses RatingBars component to show aggregated ratings from all users
- **Displays**: Overall rating distribution for a specific game

#### 4. **UserPage.tsx**
- **Location**: `/src/pages/UserPage.tsx`
- **Purpose**: User profile page
- **Usage**: Integrates UserRatingDistribution component
- **Displays**: User's personal rating distribution in profile

#### 5. **ReviewPage.tsx**
- **Location**: `/src/pages/ReviewPage.tsx`
- **Purpose**: Individual review detail page
- **Usage**:
  - Colors the large rating number display
  - Colors the horizontal progress bar
- **Displays**: Individual review rating with colored text and bar

### Review Display Components

#### 6. **ReviewCard.tsx**
- **Location**: `/src/components/ReviewCard.tsx`
- **Purpose**: Reusable review card component
- **Usage**: Colors rating badge backgrounds
- **Used In**:
  - GamePage (review list)
  - ResponsiveLandingPage (featured reviews)
  - ReviewsModal
  - ReviewGrid
  - ReviewDemo

#### 7. **ActivityFeed.tsx**
- **Location**: `/src/components/profile/ActivityFeed.tsx`
- **Purpose**: User activity timeline
- **Usage**: Colors rating text in activity items
- **Displays**: Ratings in user activity feed with appropriate color coding

## Implementation Details

### JavaScript/TypeScript Implementation

The color is typically determined using a conditional expression:

```typescript
const getColorClass = (rating: number) => {
  if (rating <= 3) return 'text-red-400';
  if (rating <= 5) return 'text-orange-400';
  if (rating <= 7) return 'text-yellow-400';
  if (rating <= 9.5) return 'text-green-400';
  return 'text-blue-400';
};
```

### Usage in JSX

```jsx
<span className={`${
  rating <= 3 ? 'text-red-400' :
  rating <= 5 ? 'text-orange-400' :
  rating <= 7 ? 'text-yellow-400' :
  rating <= 9.5 ? 'text-green-400' :
  'text-blue-400'
}`}>
  {rating}/10
</span>
```

## Design Rationale

1. **Visual Hierarchy**: Colors progress from cool (bad) to warm (good) to cool again (excellent), creating an intuitive visual language
2. **Accessibility**: Yellow ratings on badges use `text-gray-700` for better contrast
3. **Special Recognition**: Blue is reserved for near-perfect scores (>9.5), making exceptional ratings stand out
4. **Consistency**: Same scale used everywhere ensures users learn the system once and apply it throughout the app

## Maintenance Notes

- When adding new components that display ratings, refer to this document to ensure consistency
- The color scale is defined in multiple places but should always match this specification
- Consider extracting the color logic into a shared utility function if more components need it

## Last Updated
- Date: 2025-01-27
- Version: 1.0