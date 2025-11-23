import React from 'react';
import { Card, Suit } from '../types';

interface CardProps {
  card: Card;
  index: number;
  isDealer?: boolean;
}

export const CardComponent: React.FC<CardProps> = ({ card, index, isDealer = false }) => {
  const isRed = card.suit === Suit.Hearts || card.suit === Suit.Diamonds;
  
  // Outer Wrapper: Handles Positioning, Margins, Z-Index, and Entry Animation
  // Removed 'perspective-1000' locally to allow global perspective from table to work without fisheye distortion
  const wrapperStyle = `
    relative w-24 h-36 select-none animate-deal-card preserve-3d
    ${!isDealer ? 'hover:-translate-y-4 transition-transform duration-300' : ''}
  `;

  // Flipper: The element that actually rotates. 
  // 'transform-style-3d' is crucial for the front/back faces to work.
  // Note: We use a longer duration for the flip to match the "slow reveal" request
  const flipperStyle = `
    relative w-full h-full transform-style-3d transition-transform duration-[1200ms] cubic-bezier(0.175, 0.885, 0.32, 1.275) rounded-xl shadow-2xl
    ${card.isHidden ? 'rotate-y-180' : ''}
  `;

  // Face Styles: Common styles for both sides
  // 'backface-hidden' prevents the back side from showing through when flipped
  const faceStyle = "absolute inset-0 w-full h-full backface-hidden rounded-xl overflow-hidden border border-black/10 shadow-sm";

  return (
    <div 
      className={wrapperStyle}
      style={{ 
        marginLeft: index > 0 ? '-40px' : '0', // Increased overlap slightly for cleaner stacking
        zIndex: index,
        animationDelay: '0ms'
      }}
    >
      <div className={flipperStyle}>
        
        {/* --- FRONT FACE (Rank & Suit) --- */}
        <div className={`${faceStyle} bg-[#fdfbf7] flex flex-col justify-between p-2.5`}>
            {/* Top Left Rank */}
            <div className="flex flex-col items-center leading-none select-none z-10">
                <div className={`text-2xl font-bold tracking-tight ${isRed ? 'text-red-600' : 'text-black'}`}>
                    {card.rank}
                </div>
                <div className={`text-xl ${isRed ? 'text-red-600' : 'text-black'}`}>
                    {card.suit}
                </div>
            </div>
            
            {/* Center Suit Watermark */}
            <div className={`absolute inset-0 flex items-center justify-center text-6xl ${isRed ? 'text-red-600' : 'text-black'} opacity-[0.06] pointer-events-none font-serif`}>
                {card.suit}
            </div>

            {/* Bottom Right Rank (Rotated) */}
            <div className="flex flex-col items-center leading-none transform rotate-180 self-end select-none z-10">
                <div className={`text-2xl font-bold tracking-tight ${isRed ? 'text-red-600' : 'text-black'}`}>
                    {card.rank}
                </div>
                <div className={`text-xl ${isRed ? 'text-red-600' : 'text-black'}`}>
                    {card.suit}
                </div>
            </div>
            
            {/* Texture Overlays (Paper feel) */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')]"></div>
            
            {/* Slight Gradient for depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-black/5 pointer-events-none"></div>
        </div>

        {/* --- BACK FACE (Pattern) --- */}
        {/* rotate-y-180 ensures this face is 'behind' the front face initially */}
        <div 
            className={`${faceStyle} bg-[#1e3a8a] rotate-y-180 flex items-center justify-center`}
        >
            {/* Pattern */}
            <div className="absolute inset-1 border border-white/10 rounded-lg m-0.5" 
                 style={{
                    backgroundImage: `repeating-linear-gradient(45deg, #172554 0, #172554 4px, #1e3a8a 4px, #1e3a8a 8px)`,
                    backgroundBlendMode: 'overlay'
                 }}>
            </div>
            
            {/* Logo */}
            <div className="relative w-12 h-12 bg-blue-900 rounded-full flex items-center justify-center border-2 border-white/20 shadow-inner z-10">
                <span className="text-xs text-blue-200 font-bold tracking-wider">KF</span>
            </div>

            {/* Shine */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none"></div>
        </div>

      </div>
    </div>
  );
};