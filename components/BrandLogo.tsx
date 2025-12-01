
import React from 'react';

interface BrandLogoProps {
  className?: string;
  variant?: 'full' | 'simple' | 'monochrome'; 
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = "w-48 h-auto", variant = 'full' }) => {
  const isMonochrome = variant === 'monochrome';
  const isFull = variant === 'full' || variant === 'simple';

  // Brand Colors
  const c = {
    textFace: isMonochrome ? "currentColor" : "#FFFFFF",
    textStroke: isMonochrome ? "none" : "#0f172a", // Dark border
    textShadow: isMonochrome ? "currentColor" : "#001F3F", // Deep Blue 3D
    joyBase: isMonochrome ? "currentColor" : "#0EA5E9", // Sky Blue
    joyBtn: isMonochrome ? "currentColor" : "#FACC15", // Yellow
    joyStick: isMonochrome ? "currentColor" : "#9CA3AF", // Grey
    joyBall: isMonochrome ? "currentColor" : "#EF4444", // Red
    streakGreen: "#4ADE80",
    streakBlue: "#3B82F6",
    fireOrange: "#F97316",
    fireRed: "#EF4444"
  };

  return (
    <svg 
      viewBox="0 0 500 180" 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <style>
          {`
            .khel-font { 
              font-family: 'Anton', sans-serif; 
              font-weight: 900; 
              font-style: italic;
              text-anchor: middle;
            }
          `}
        </style>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* --- LAYER 1: BACKGROUND ELEMENTS (Streaks & Fire) --- */}
      {!isMonochrome && (
        <g transform="translate(0, 10)">
          {/* Green Speed Streak (Top Left) */}
          <path d="M 160 60 L 250 50 L 280 60 L 100 80 Q 50 70 20 60 L 160 60 Z" fill={c.streakGreen} />
          
          {/* Blue Speed Streak (Bottom Left) */}
          <path d="M 140 90 L 240 85 L 260 100 L 40 120 Q 10 110 0 100 L 140 90 Z" fill={c.streakBlue} />

          {/* Fire (Right Side) */}
          <g transform="translate(320, 30) scale(1.2)">
             <path d="M 50 60 Q 70 10 90 40 Q 100 20 80 80 L 40 90 Z" fill={c.joyBtn} /> {/* Yellow tip */}
             <path d="M 30 70 Q 50 30 70 80 L 20 100 Z" fill={c.fireOrange} />
             <path d="M 10 90 Q 30 60 50 110 L 0 110 Z" fill={c.fireRed} />
          </g>
        </g>
      )}
      
      {/* Monochrome Background Placeholder */}
      {isMonochrome && (
         <g transform="translate(0, 10)" opacity="0.2">
            <path d="M 140 90 L 240 85 L 260 100 L 40 120 Z" fill="currentColor" />
            <path d="M 360 40 L 420 80 L 380 120 Z" fill="currentColor" />
         </g>
      )}

      {/* --- LAYER 2: JOYSTICK (Mid-ground) --- */}
      {/* Positioned behind text but in front of streaks */}
      <g transform="translate(280, 50) rotate(15)">
         {/* Base */}
         <path 
            d="M -40 20 L 50 20 Q 60 20 60 30 L 60 60 Q 60 70 50 70 L -40 70 Q -50 70 -50 60 L -50 30 Q -50 20 -40 20 Z" 
            fill={c.joyBase} 
            stroke={c.textStroke} 
            strokeWidth={isMonochrome ? 0 : 2}
            opacity={isMonochrome ? 0.5 : 1}
         />
         {/* Base Side (3D depth) */}
         <path d="M -50 60 L -50 75 L 50 75 L 60 60" fill="#0369A1" opacity={isMonochrome ? 0 : 1} />
         
         {/* Buttons */}
         <circle cx="-20" cy="45" r="8" fill={c.joyBtn} stroke={c.textStroke} strokeWidth={isMonochrome ? 0 : 1} />
         <circle cx="30" cy="45" r="8" fill={c.joyBtn} stroke={c.textStroke} strokeWidth={isMonochrome ? 0 : 1} />
         
         {/* Stick Shaft */}
         <rect x="-2" y="-10" width="10" height="40" fill={c.joyStick} stroke={c.textStroke} strokeWidth={isMonochrome ? 0 : 1} />
         
         {/* Stick Ball */}
         <circle cx="3" cy="-10" r="14" fill={c.joyBall} stroke={c.textStroke} strokeWidth={isMonochrome ? 0 : 1.5} />
      </g>

      {/* --- LAYER 3: TEXT (Foreground) --- */}
      <g transform="translate(250, 130) skewX(-10)">
        {/* 3D Extrusion/Shadow (Dark Blue) */}
        {/* We draw the text multiple times slightly offset to create a thick block shadow */}
        <text x="6" y="6" fontSize="100" className="khel-font" fill={c.textShadow} opacity={isMonochrome ? 0.3 : 1}>Khel.fun</text>
        <text x="4" y="4" fontSize="100" className="khel-font" fill={c.textShadow} opacity={isMonochrome ? 0.3 : 1}>Khel.fun</text>
        <text x="2" y="2" fontSize="100" className="khel-font" fill={c.textShadow} opacity={isMonochrome ? 0.3 : 1}>Khel.fun</text>
        
        {/* Main Face (White) */}
        <text x="0" y="0" fontSize="100" className="khel-font" fill={c.textFace} stroke={c.textStroke} strokeWidth={isMonochrome ? 0 : 2}>
          Khel.fun
        </text>
        
        {/* Highlight/Gloss on Text (Subtle) */}
        {!isMonochrome && (
           <text x="0" y="0" fontSize="100" className="khel-font" fill="url(#textGrad)" fillOpacity="0.2" pointerEvents="none">
             Khel.fun
           </text>
        )}
      </g>
    </svg>
  );
};