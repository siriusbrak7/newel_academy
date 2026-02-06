// components/YouTubeEmbed.tsx
import React, { useState } from 'react';
import { ExternalLink, Play, AlertCircle } from 'lucide-react';

interface YouTubeEmbedProps {
  url: string;
  title?: string;
  className?: string;
}

export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ url, title, className = '' }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Extract YouTube video ID from various URL formats
  const getVideoId = (url: string): string | null => {
    if (!url || typeof url !== 'string') return null;

    const patterns = [
      // Standard watch URLs: youtube.com/watch?v=ID
      /(?:youtube\.com\/watch\?.*v=)([^"&?\/\s]{11})/,
      // Embed URLs: youtube.com/embed/ID
      /youtube\.com\/embed\/([^"&?\/\s]{11})/,
      // Short URLs: youtu.be/ID
      /youtu\.be\/([^"&?\/\s]{11})/,
      // Old format: youtube.com/v/ID
      /youtube\.com\/v\/([^"&?\/\s]{11})/,
      // Shorts: youtube.com/shorts/ID
      /youtube\.com\/shorts\/([^"&?\/\s]{11})/,
      // Live: youtube.com/live/ID
      /youtube\.com\/live\/([^"&?\/\s]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };

  const videoId = getVideoId(url);

  // Not a valid YouTube URL — render as a plain link
  if (!videoId) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-400 hover:text-cyan-300 underline inline-flex items-center gap-1"
      >
        {title || url} <ExternalLink size={12} />
      </a>
    );
  }

  // Iframe failed to load
  if (hasError) {
    return (
      <div className={`w-full ${className}`}>
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
          <div>
            <p className="text-white/80 text-sm">Video failed to load.</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 text-sm inline-flex items-center gap-1 mt-1"
            >
              Open in YouTube <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* 16:9 aspect ratio container */}
      <div className="relative pb-[56.25%] h-0 rounded-lg overflow-hidden bg-black/30">
        {/* Loading placeholder */}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <div className="flex flex-col items-center gap-2">
              <Play className="text-white/40" size={40} />
              <span className="text-white/40 text-sm">Loading video...</span>
            </div>
          </div>
        )}
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
          className="absolute top-0 left-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          title={title || 'YouTube video player'}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        {title && <span className="text-sm text-white/70 truncate">{title}</span>}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 ml-auto"
        >
          Open in YouTube <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
};