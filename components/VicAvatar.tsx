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
  
  // Dynamic lighting based on game state
  const getLightingClass = () => {
     if (isThinking) return "bg-blue-400/20 mix-blend-overlay animate-pulse-glow";
     if (dominantResult === GameResult.PlayerWin || dominantResult === GameResult.Blackjack) return "bg-amber-400/30 mix-blend-soft-light transition-all duration-1000";
     if (dominantResult === GameResult.DealerWin || dominantResult === GameResult.Bust) return "bg-red-900/40 mix-blend-multiply transition-all duration-1000";
     if (dominantResult === GameResult.Push) return "bg-gray-400/20 mix-blend-overlay";
     return "bg-indigo-900/10 mix-blend-overlay"; // Ambient casino default
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
                    className="w-full h-full object-cover rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/5"
                    style={{ 
                        mixBlendMode: 'lighten', 
                        filter: 'contrast(1.15) brightness(1.1) saturate(1.1)' 
                    }}
                  />
                  
                  {/* Dynamic Lighting Overlay */}
                  <div className={`absolute inset-0 rounded-2xl pointer-events-none ${lightingClass}`}></div>

                  {/* Noise/Grain Texture for realism */}
                  <div 
                    className="absolute inset-0 rounded-2xl pointer-events-none opacity-20 mix-blend-overlay"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    }}
                  ></div>

                  {/* Reflection Highlight */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none mix-blend-overlay"></div>
              </div>
          </div>
      )
  }

  return (
    <div className={`relative flex-shrink-0 z-0 ${className}`}>
      {/* Floating Container with Breathe Animation */}
      <div className="w-full h-full animate-breathe filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] relative">
        
        <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible" preserveAspectRatio="xMidYMid meet">
            <defs>
                {/* 1. Skin Gradients - Realistic Warm Tone */}
                <linearGradient id="skinBase" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#FFF0E0" />   {/* Highlight */}
                    <stop offset="40%" stopColor="#F5D0B5" />   {/* Midtone */}
                    <stop offset="100%" stopColor="#E0AC90" />  {/* Shadow */}
                </linearGradient>
                
                {/* 2. Contouring / Blush */}
                <radialGradient id="cheekBlush" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#D47F7F" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#D47F7F" stopOpacity="0"/>
                </radialGradient>

                {/* 3. Hair Gradients - Deep Dark Brown/Black with Sheen */}
                <linearGradient id="hairBase" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2E1C16" />
                    <stop offset="60%" stopColor="#120A08" />
                    <stop offset="100%" stopColor="#050201" />
                </linearGradient>
                
                <linearGradient id="hairHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="white" stopOpacity="0.15" />
                    <stop offset="50%" stopColor="white" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                </linearGradient>

                {/* 4. Eye Details */}
                <radialGradient id="eyeIris" cx="50%" cy="50%" r="50%">
                    <stop offset="50%" stopColor="#5D4037" /> {/* Warm Brown */}
                    <stop offset="100%" stopColor="#2D1E16" /> {/* Dark Rim */}
                </radialGradient>
                <linearGradient id="eyeShadowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4A3025" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#4A3025" stopOpacity="0" />
                </linearGradient>

                {/* 5. Lips - Glossy Red */}
                <linearGradient id="lipGradient" x1="50%" y1="0%" x2="50%" y2="100%">
                     <stop offset="0%" stopColor="#CC5555" />
                     <stop offset="40%" stopColor="#B33939" />
                     <stop offset="100%" stopColor="#8A2020" />
                </linearGradient>
                <linearGradient id="lipGloss" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="white" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                </linearGradient>
                
                {/* SVG Noise Filter */}
                <filter id="svgNoise">
                    <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.1 0"/>
                    <feComposite operator="in" in2="SourceGraphic" result="monoNoise"/>
                    <feBlend in="SourceGraphic" in2="monoNoise" mode="multiply" />
                </filter>
            </defs>

            {/* --- LAYERS START --- */}

            {/* 1. Hair (Back) - Volume behind head */}
            <path d="M 80 120 C 40 180 40 300 70 360 L 330 360 C 360 300 360 180 320 120 C 280 60 120 60 80 120" fill="url(#hairBase)" filter="url(#svgNoise)" />

            {/* 2. Body / Clothing (Tuxedo Look) */}
            <g transform="translate(0, 20)">
                 {/* Shoulders */}
                 <path d="M 70 340 Q 120 330 200 330 Q 280 330 330 340 L 350 420 L 50 420 Z" fill="#111827" /> 
                 {/* White Shirt Collar area */}
                 <path d="M 150 330 L 200 400 L 250 330" fill="#F9FAFB" />
                 {/* Vest/Jacket Lapels */}
                 <path d="M 150 330 Q 160 380 150 420 L 70 420 L 70 340" fill="#111827" opacity="0.95"/>
                 <path d="M 250 330 Q 240 380 250 420 L 330 420 L 330 340" fill="#111827" opacity="0.95"/>
                 {/* Black Bowtie */}
                 <path d="M 175 355 L 225 355 L 220 380 L 180 380 Z" fill="#000" />
                 <path d="M 170 350 Q 175 365 170 385 L 185 368 Z" fill="#000" /> {/* Left wing */}
                 <path d="M 230 350 Q 225 365 230 385 L 215 368 Z" fill="#000" /> {/* Right wing */}
            </g>

            {/* 3. Neck */}
            <path d="M 165 260 L 165 340 L 235 340 L 235 260" fill="#E0AC90" />
            <path d="M 165 260 Q 200 320 235 260" fill="#000" opacity="0.15" /> {/* Shadow under jaw */}

            {/* 4. Head Group */}
            <g transform="translate(200, 200)">
                {/* Face Shape - Elegant sculpted jaw */}
                <path d="M -75 -90 C -85 -20 -70 80 0 110 C 70 80 85 -20 75 -90 C 70 -160 -70 -160 -75 -90" fill="url(#skinBase)" filter="url(#svgNoise)" />
                
                {/* Hairline Shadow */}
                <path d="M -75 -90 C -70 -140 70 -140 75 -90 L 75 -100 C 70 -150 -70 -150 -75 -100 Z" fill="#000" opacity="0.1" />

                {/* Blush */}
                <ellipse cx="-45" cy="15" rx="20" ry="12" fill="url(#cheekBlush)" transform="rotate(-10)" />
                <ellipse cx="45" cy="15" rx="20" ry="12" fill="url(#cheekBlush)" transform="rotate(10)" />

                {/* Nose - Defined by shadow, not outline */}
                <path d="M -8 -5 Q 0 35 -10 45 Q 0 55 10 45 Q 0 35 8 -5" fill="#CD8557" opacity="0.15" />
                <path d="M -5 42 Q 0 48 5 42" fill="none" stroke="#CD8557" strokeWidth="1" opacity="0.2" /> {/* Nostril shadow hint */}

                {/* Lips */}
                <g transform="translate(0, 65)">
                     {/* Base Shape */}
                     <path d="M -22 0 Q 0 12 22 0 Q 0 28 -22 0 Z" fill="url(#lipGradient)" /> {/* Bottom */}
                     <path d="M -22 0 Q -12 -12 0 -6 Q 12 -12 22 0 Q 0 6 -22 0 Z" fill="#A13030" /> {/* Top */}
                     {/* Highlight */}
                     <path d="M -12 5 Q 0 10 12 5" fill="none" stroke="url(#lipGloss)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                     
                     {/* Thinking Animation */}
                     {isThinking && (
                        <animateTransform attributeName="transform" type="scale" values="1; 0.95; 1" dur="1.5s" repeatCount="indefinite" />
                     )}
                </g>

                {/* Eyes Group */}
                <g transform="translate(0, -15)">
                     {/* Left Eye */}
                     <g transform="translate(-38, 0)">
                        <path d="M -24 0 Q 0 -22 24 0 Q 0 14 -24 0 Z" fill="#FFF" />
                        <circle cx="0" cy="0" r="10" fill="url(#eyeIris)" />
                        <circle cx="0" cy="0" r="4" fill="#000" />
                        <circle cx="4" cy="-4" r="2.5" fill="#FFF" opacity="0.8" />
                        {/* Makeup / Eyelashes */}
                        <path d="M -24 0 Q 0 -24 26 -2" fill="none" stroke="#1A100A" strokeWidth="3.5" strokeLinecap="round" />
                        <path d="M 26 -2 L 30 -8" stroke="#1A100A" strokeWidth="2" /> {/* Wing */}
                        <path d="M -24 0 Q 0 -26 26 -2" fill="none" stroke="url(#eyeShadowGrad)" strokeWidth="6" />
                        {/* Eyebrow */}
                        <path d="M -28 -15 Q 0 -28 30 -12" fill="none" stroke="#2E1C16" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
                     </g>

                     {/* Right Eye */}
                     <g transform="translate(38, 0)">
                        <path d="M -24 0 Q 0 -22 24 0 Q 0 14 -24 0 Z" fill="#FFF" />
                        <circle cx="0" cy="0" r="10" fill="url(#eyeIris)" />
                        <circle cx="0" cy="0" r="4" fill="#000" />
                        <circle cx="4" cy="-4" r="2.5" fill="#FFF" opacity="0.8" />
                        {/* Makeup / Eyelashes */}
                        <path d="M -26 -2 Q 0 -24 24 0" fill="none" stroke="#1A100A" strokeWidth="3.5" strokeLinecap="round" />
                        <path d="M 24 0 L 28 -6" stroke="#1A100A" strokeWidth="2" opacity="0" /> {/* No wing on inner side? Actually wing is on outer side. */}
                        <path d="M -26 -2 L -30 -8" stroke="#1A100A" strokeWidth="2" /> {/* Wing */}
                        <path d="M -26 -2 Q 0 -26 24 0" fill="none" stroke="url(#eyeShadowGrad)" strokeWidth="6" />
                        {/* Eyebrow */}
                        <path d="M -30 -12 Q 0 -28 28 -15" fill="none" stroke="#2E1C16" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
                     </g>

                     {/* Blink Animation */}
                     <animateTransform attributeName="transform" type="scale" values="1 1; 1 0.1; 1 1" keyTimes="0; 0.05; 0.1" dur="4.5s" repeatCount="indefinite" />
                </g>
            </g>

            {/* 5. Hair Front (Bangs / Styling) */}
            <path d="M 120 70 Q 110 150 70 250 Q 150 200 200 100 Q 250 80 200 60 Z" fill="url(#hairBase)" opacity="0.95" filter="url(#svgNoise)" />
            <path d="M 280 90 Q 300 150 330 250 Q 300 150 240 80 Z" fill="url(#hairBase)" opacity="0.95" filter="url(#svgNoise)" />
            
            {/* Loose strands */}
            <path d="M 200 60 Q 260 70 320 250" fill="none" stroke="url(#hairBase)" strokeWidth="20" strokeLinecap="round" opacity="0.8" />
            
            {/* Hair Shine Reflection */}
            <path d="M 140 100 Q 200 80 260 100" fill="none" stroke="url(#hairHighlight)" strokeWidth="15" strokeLinecap="round" opacity="0.4" />

            {/* 6. Accessories */}
            <circle cx="125" cy="225" r="4" fill="#FCD34D" /> {/* Left Earring Gold */}
            <circle cx="275" cy="225" r="4" fill="#FCD34D" /> {/* Right Earring Gold */}
            
            {/* Lighting Overlay for SVG */}
             <rect x="0" y="0" width="400" height="400" className={lightingClass} fill="currentColor" />

        </svg>
      </div>
    </div>
  );
};