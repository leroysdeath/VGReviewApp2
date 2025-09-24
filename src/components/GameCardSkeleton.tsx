import React from 'react';

interface GameCardSkeletonProps {
  listView?: boolean;
  className?: string;
  count?: number;
}

/**
 * GameCardSkeleton - Loading placeholder for GameCard components
 * Prevents layout shift by maintaining the exact dimensions expected for game cards
 */
export const GameCardSkeleton: React.FC<GameCardSkeletonProps> = ({
  listView = false,
  className = '',
  count = 1
}) => {
  const skeletonItem = (
    <div className={`${listView ? 'flex gap-4 p-4' : 'block'} ${className}`}>
      {/* Image skeleton - maintains 3:4 aspect ratio for game covers */}
      <div
        className={`
          ${listView ? 'w-20 h-28 flex-shrink-0' : 'w-full'}
          bg-gray-700 animate-pulse rounded-lg
        `}
        style={!listView ? { aspectRatio: '3 / 4' } : {}}
      />

      {/* Content skeleton */}
      <div className={`${listView ? 'flex-1' : 'mt-3'} space-y-2`}>
        {/* Title */}
        <div className="h-5 bg-gray-700 animate-pulse rounded w-3/4" />

        {/* Rating */}
        <div className="h-4 bg-gray-700 animate-pulse rounded w-1/2" />

        {/* Additional info for list view */}
        {listView && (
          <>
            <div className="h-4 bg-gray-700 animate-pulse rounded w-full" />
            <div className="h-4 bg-gray-700 animate-pulse rounded w-2/3" />
          </>
        )}

        {/* Genre/Release date for grid view */}
        {!listView && (
          <div className="h-4 bg-gray-700 animate-pulse rounded w-2/3" />
        )}
      </div>
    </div>
  );

  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }, (_, i) => (
          <div key={i}>{skeletonItem}</div>
        ))}
      </>
    );
  }

  return skeletonItem;
};

/**
 * Grid skeleton for multiple cards
 */
export const GameCardGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <GameCardSkeleton key={i} />
      ))}
    </div>
  );
};

/**
 * List skeleton for multiple cards
 */
export const GameCardListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-gray-800 rounded-lg">
          <GameCardSkeleton listView />
        </div>
      ))}
    </div>
  );
};