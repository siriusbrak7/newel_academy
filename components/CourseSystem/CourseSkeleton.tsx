import React from 'react';

export const CourseSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto p-4 animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-700 rounded mb-4"></div>
        <div className="h-4 w-64 bg-gray-800 rounded"></div>
      </div>

      {/* Subject Selection Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 bg-gray-800 rounded-lg"></div>
        ))}
      </div>

      {/* Course Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="h-6 w-3/4 bg-gray-700 rounded mb-4"></div>
            <div className="h-4 w-full bg-gray-800 rounded mb-2"></div>
            <div className="h-4 w-2/3 bg-gray-800 rounded mb-4"></div>
            
            <div className="flex items-center justify-between">
              <div className="h-6 w-16 bg-gray-700 rounded"></div>
              <div className="h-8 w-24 bg-gray-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Indicator */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-3 text-gray-400">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-cyan-500"></div>
          <span>Loading personalized courses...</span>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Fetching your course data from our optimized database
        </p>
      </div>
    </div>
  );
};