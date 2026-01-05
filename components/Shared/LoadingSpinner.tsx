// components/Shared/LoadingSpinner.tsx
export const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="text-center">
      <div className="relative">
        <div className="w-20 h-20 border-4 border-cyan-500/30 rounded-full"></div>
        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
      </div>
      <p className="mt-4 text-white text-lg font-medium">{message}</p>
      <p className="text-white/60 text-sm mt-2">Please wait while we load your content</p>
    </div>
  </div>
);