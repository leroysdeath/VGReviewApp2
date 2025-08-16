import React, { useEffect, useRef } from 'react';

interface RatingData {
  rating: number;
  count: number;
  percentage: number;
}

interface RatingChartProps {
  data: RatingData[];
  className?: string;
}

export const RatingChart: React.FC<RatingChartProps> = ({ data, className = '' }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animate bars on mount
    const bars = chartRef.current?.querySelectorAll('.rating-bar');
    if (bars) {
      bars.forEach((bar, index) => {
        const element = bar as HTMLElement;
        setTimeout(() => {
          element.style.width = `${data[index]?.percentage || 0}%`;
        }, index * 100);
      });
    }
  }, [data]);

  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <div ref={chartRef} className={`space-y-3 ${className}`}>
      {data.map((item) => (
        <div key={item.rating} className="flex items-center gap-3">
          <div className="flex items-center gap-1 w-12">
            <span className="text-sm text-gray-400">{item.rating}</span>
            <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          
          <div className="flex-1 relative">
            <div className="bg-gray-800 rounded-full h-3 overflow-hidden">
              <div
                className="rating-bar bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all duration-700 ease-out rounded-full"
                style={{ width: '0%' }}
              />
            </div>
            
            {/* Tooltip on hover */}
            <div className="absolute left-0 top-full mt-1 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 pointer-events-none transition-opacity duration-200 hover:opacity-100 z-10">
              {item.count.toLocaleString()} reviews ({item.percentage}%)
            </div>
          </div>
          
          <div className="text-sm text-gray-400 w-12 text-right">
            {item.percentage}%
          </div>
          
          <div className="text-sm text-gray-500 w-16 text-right">
            {item.count.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
};