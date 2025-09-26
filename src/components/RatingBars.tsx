import React from 'react';

interface RatingDistributionItem {
  rating: number;
  count: number;
  percentage: number;
}

interface RatingBarsProps {
  distribution: RatingDistributionItem[];
  totalRatings: number;
  averageRating?: number;
  barHeight?: number;
  showLabels?: boolean;
  interactive?: boolean;
  onBarClick?: (rating: number) => void;
  showTotalRatings?: boolean;
}

export const RatingBars: React.FC<RatingBarsProps> = ({
  distribution,
  totalRatings,
  averageRating,
  barHeight = 80,
  showLabels = true,
  interactive = false,
  onBarClick,
  showTotalRatings = true,
}) => {
  // Calculate the color for each bar based on rating (red to yellow to green to blue gradient)
  const getBarColor = (rating: number): string => {
    if (rating <= 3) {
      // Red for low ratings
      return 'bg-red-500';
    } else if (rating <= 5) {
      // Orange for mid-low ratings
      return 'bg-orange-500';
    } else if (rating <= 7) {
      // Yellow for mid-high ratings
      return 'bg-yellow-500';
    } else if (rating <= 9.5) {
      // Green for high ratings
      return 'bg-green-500';
    } else {
      // Blue for perfect/near-perfect ratings (>9.5)
      return 'bg-blue-500';
    }
  };

  return (
    <div className="w-full">
      {/* Average rating display */}
      {averageRating !== undefined && totalRatings > 0 && (
        <div className="mb-4 text-center">
          <div className="text-3xl font-bold text-white">
            {averageRating.toFixed(1)}
          </div>
          <div className="text-sm text-gray-400">
            Average Rating
          </div>
        </div>
      )}

      {/* Rating bars */}
      <div className="flex flex-col space-y-2 w-full max-w-sm mx-auto">
        <div className="flex items-end gap-[2px] w-full" style={{ height: `${barHeight}px` }}>
          {distribution.map((item) => (
            <div
              key={item.rating}
              className={`relative group flex-1 ${interactive ? 'cursor-pointer' : ''}`}
              onClick={() => interactive && onBarClick?.(item.rating)}
            >
              {/* Bar */}
              <div
                className={`w-full ${getBarColor(item.rating)} rounded-sm transition-all duration-200 ${
                  interactive ? 'hover:opacity-80' : ''
                }`}
                style={{
                  height: item.count > 0
                    ? `${Math.max((item.percentage / 100) * barHeight, 2)}px`
                    : '2px',
                  backgroundColor: item.count === 0 ? '#4b5563' : undefined
                }}
              >
                {/* Tooltip on hover */}
                {item.count > 0 && (
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none z-10">
                    {item.count} {item.count === 1 ? 'rating' : 'ratings'} ({item.percentage.toFixed(1)}%)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Labels */}
        {showLabels && (
          <div className="flex gap-[2px] w-full">
            {distribution.map((item) => (
              <div
                key={item.rating}
                className="flex-1 text-xs text-gray-500 text-center"
              >
                {item.rating}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total ratings */}
      {showTotalRatings && totalRatings > 0 && (
        <div className="text-center mt-3 text-sm text-gray-400">
          {totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}
        </div>
      )}
    </div>
  );
};