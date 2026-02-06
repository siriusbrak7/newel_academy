// components/YouTubeEmbed.tsx
import React from 'react';

interface YouTubeEmbedProps {
  url: string;
  className?: string;
}

export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ url, className = '' }) => {
  // Extract YouTube video ID from various URL formats
  const getVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
      /youtube\.com\/embed\/([^"&?\/\s]{11})/,
      /youtube\.com\/v\/([^"&?\/\s]{11})/,
      /youtu\.be\/([^"&?\/\s]{11})/
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

  if (!videoId) {
    // Not a valid YouTube URL, show as regular link
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-cyan-400 hover:text-cyan-300 underline"
      >
        {url}
      </a>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="relative pb-[56.25%] h-0 rounded-lg overflow-hidden"> {/* 16:9 aspect ratio */}
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
          className="absolute top-0 left-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video player"
        />
      </div>
      <p className="text-sm text-white/60 mt-2">
        YouTube video embedded. <a href={url} target="_blank" rel="noopener noreferrer" className="text-cyan-400">Open in YouTube</a>
      </p>
    </div>
  );
};