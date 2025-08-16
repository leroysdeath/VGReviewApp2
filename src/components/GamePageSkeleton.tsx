import React from 'react';

export const GamePageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--game-dark)] text-white animate-pulse">
      {/* Breadcrumb Skeleton */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <div className="h-4 bg-gray-700 rounded w-12"></div>
            <div className="h-4 w-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-16"></div>
            <div className="h-4 w-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-32"></div>
          </div>
        </div>
      </div>

      {/* Hero Section Skeleton */}
      <section className="relative">
        <div className="absolute inset-0 bg-gray-800"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-12 lg:py-20">
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            {/* Game Cover Skeleton */}
            <div className="lg:col-span-1">
              <div className="w-full max-w-sm mx-auto lg:mx-0 aspect-[3/4] bg-gray-700 rounded-lg"></div>
            </div>

            {/* Game Info Skeleton */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="h-12 bg-gray-700 rounded mb-4 w-3/4"></div>
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <div className="h-6 bg-gray-700 rounded w-32"></div>
                  <div className="h-6 bg-gray-700 rounded w-24"></div>
                  <div className="h-6 bg-gray-700 rounded w-20"></div>
                </div>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-6 w-6 bg-gray-700 rounded"></div>
                    ))}
                  </div>
                  <div className="h-8 bg-gray-700 rounded w-12"></div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-8 bg-gray-700 rounded w-24"></div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="h-12 bg-gray-700 rounded w-32"></div>
                <div className="h-12 bg-gray-700 rounded w-40"></div>
                <div className="h-12 bg-gray-700 rounded w-36"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {/* Tab Navigation Skeleton */}
            <div className="flex border-b border-gray-800 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-700 rounded-t w-32 mr-4"></div>
              ))}
            </div>

            {/* Content Skeleton */}
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="h-8 bg-gray-700 rounded w-48"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-full"></div>
                  <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-700 rounded w-4/5"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-video bg-gray-700 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-gray-900 rounded-lg p-6">
              <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 bg-gray-700 rounded w-20"></div>
                    <div className="h-4 bg-gray-700 rounded w-16"></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6">
              <div className="h-6 bg-gray-700 rounded w-40 mb-4"></div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-16 h-20 bg-gray-700 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-700 rounded w-full"></div>
                      <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                      <div className="h-4 bg-gray-700 rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};