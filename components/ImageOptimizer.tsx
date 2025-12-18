// src/components/ImageOptimizer.tsx
import React, { useState } from 'react';

interface ImageOptimizerProps {
  src: string;
  alt: string;
  className?: string;
  scienceThemed?: boolean;
}

export const ImageOptimizer: React.FC<ImageOptimizerProps> = ({ 
  src, 
  alt, 
  className,
  scienceThemed = false 
}) => {
  const [loaded, setLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState(src);

  // Generate a relevant science-themed image URL based on alt text
  const getScienceImage = (text: string) => {
    const keywords = text.toLowerCase();
    
    if (keywords.includes('learning') || keywords.includes('assistant') || keywords.includes('ai') || keywords.includes('tutor')) {
      return 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=600&h=400&fit=crop&auto=format&q=80';
    }
    
    if (keywords.includes('tutor') || keywords.includes('teacher') || keywords.includes('expert')) {
      return 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&h=400&fit=crop&auto=format&q=80';
    }
    
    if (keywords.includes('challenge') || keywords.includes('interactive') || keywords.includes('quiz') || keywords.includes('game')) {
      return 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&h=400&fit=crop&auto=format&q=80';
    }
    
    if (keywords.includes('course') || keywords.includes('mastery') || keywords.includes('curriculum')) {
      return 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&h=400&fit=crop&auto=format&q=80';
    }
    
    if (keywords.includes('analytics') || keywords.includes('progress') || keywords.includes('tracking')) {
      return 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&auto=format&q=80';
    }
    
    if (keywords.includes('resources') || keywords.includes('study') || keywords.includes('material')) {
      return 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop&auto=format&q=80';
    }
    
    return `https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&h=400&fit=crop&auto=format&q=80`;
  };

  const handleError = () => {
    const scienceImage = getScienceImage(alt);
    setImgSrc(scienceImage);
    setLoaded(true);
  };

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-800 to-purple-900 animate-pulse" />
      )}
      <img 
        src={imgSrc} 
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};