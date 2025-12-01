
import React from 'react';
import { GameResult } from '../types';

interface VicAvatarProps {
  isThinking: boolean;
  className?: string;
  imageUrl?: string | null;
  dominantResult?: GameResult;
}

export const VicAvatar: React.FC<VicAvatarProps> = ({ 
    isThinking, 
    className = "w-24 h-24", 
    imageUrl,
    dominantResult
}) => {
  
  // Clean matte lighting based on game state (Opacity overlays only, no mix-blend-overlay)
  const getLightingClass = () => {
     if (isThinking) return "bg-blue-500/10 animate-pulse";
     if (dominantResult === GameResult.PlayerWin || dominantResult === GameResult.Blackjack) return "bg-amber-500/10";
     if (dominantResult === GameResult.DealerWin || dominantResult === GameResult.Bust) return "bg-red-500/10";
     return ""; 
  };

  const lightingClass = getLightingClass();

  if (imageUrl) {
      return (
          <div className={`relative flex-shrink-0 z-0 ${className}`}>
              <div className="w-full h-full animate-breathe relative">
                  {/* Base Image */}
                  <img 
                    src={imageUrl} 
                    alt="Victoria Dealer" 
                    className="w-full h-full object-cover rounded-2xl shadow-lg border border-white/5"
                  />
                  
                  {/* Dynamic Matte Tint */}
                  <div className={`absolute inset-0 rounded-2xl pointer-events-none transition-colors duration-1000 ${lightingClass}`}></div>
              </div>
          </div>
      )
  }

  // Fallback SVG avatar (Simplified Matte)
  return (
    <div className={`relative flex-shrink-0 z-0 ${className}`}>
      <div className="w-full h-full animate-breathe relative drop-shadow-lg">
        <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible" preserveAspectRatio="xMidYMid meet">
            <defs>
                {/* Simplified Gradients */}
                <linearGradient id="skinBase" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#FFF0E0" />
                    <stop offset="100%" stopColor="#E0AC90" />
                </linearGradient>
                <linearGradient id="hairBase" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2E1C16" />
                    <stop offset="100%" stopColor="#050201" />
                </linearGradient>
            </defs>

            {/* Hair Back */}
            <path d="M 80 120 C 40 180 40 300 70 360 L 330 360 C 360 300 360 180 320 120 C 280 60 120 60 80 120" fill="url(#hairBase)" />
            {/* Shoulders */}
            <path d="M 70 360 Q 120 350 200 350 Q 280 350 330 360 L 350 420 L 50 420 Z" fill="#111827" /> 
            {/* Neck */}
            <path d="M 165 260 L 165 360 L 235 360 L 235 260" fill="#E0AC90" />
            {/* Face */}
            <path d="M 125 110 C 115 180 130 280 200 310 C 270 280 285 180 275 110 C 270 40 130 40 125 110" fill="url(#skinBase)" />
            {/* Hair Front */}
            <path d="M 120 70 Q 110 150 70 250 Q 150 200 200 100 Q 250 80 200 60 Z" fill="url(#hairBase)" />
            <path d="M 280 90 Q 300 150 330 250 Q 300 150 240 80 Z" fill="url(#hairBase)" />
            
             <rect x="0" y="0" width="400" height="400" className={lightingClass} fill="currentColor" />
        </svg>
      </div>
    </div>
  );
};