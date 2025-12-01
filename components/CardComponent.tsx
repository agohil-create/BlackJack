
import React from 'react';
import { Card, Suit } from '../types';
import { BrandLogo } from './BrandLogo';

interface CardProps {
  card: Card;
  index: number;
  isDealer?: boolean;
}

export const CardComponent: React.FC<CardProps> = ({ card, index, isDealer = false }) => {
  const isRed = card.suit === Suit.Hearts || card.suit === Suit.Diamonds;
  
  // Outer Wrapper
  const wrapperStyle = `
    relative w-24 h-36 select-none animate-deal-card preserve-3d
    ${!isDealer ? 'hover:-translate-y-4 transition-transform duration-300' : ''}
  `;

  // Flipper
  const flipperStyle = `
    relative w-full h-full transform-style-3d transition-transform duration-[1200ms] cubic-bezier(0.175, 0.885, 0.32, 1.275) rounded-xl shadow-md
    ${card.isHidden ? 'rotate-y-180' : ''}
  `;

  // Face Styles - Matte, no gloss
  const faceStyle = "absolute inset-0 w-full h-full backface-hidden rounded-xl overflow-hidden border border-black/10 shadow-sm";

  return (
    <div 
      className={wrapperStyle}
      style={{ 
        marginLeft: index > 0 ? '-30px' : '0', 
        zIndex: index,
        animationDelay: '0ms'
      }}
    >
      <div className={flipperStyle}>
        
        {/* --- FRONT FACE --- */}
        <div className={`${faceStyle} bg-[#fdfbf7] flex flex-col justify-between p-2.5`}>
            {/* Top Left Rank */}
            <div className="flex flex-col items-center leading-none select-none z-10">
                <div className={`text-2xl font-bold tracking-tight font-sans ${isRed ? 'text-khel-red' : 'text-black'}`}>
                    {card.rank}
                </div>
                <div className={`text-xl ${isRed ? 'text-khel-red' : 'text-black'}`}>
                    {card.suit}
                </div>
            </div>
            
            {/* Center Suit Watermark */}
            <div className={`absolute inset-0 flex items-center justify-center text-6xl ${isRed ? 'text-khel-red' : 'text-black'} opacity-[0.06] pointer-events-none font-serif`}>
                {card.suit}
            </div>

            {/* Bottom Right Rank (Rotated) */}
            <div className="flex flex-col items-center leading-none transform rotate-180 self-end select-none z-10">
                <div className={`text-2xl font-bold tracking-tight font-sans ${isRed ? 'text-khel-red' : 'text-black'}`}>
                    {card.rank}
                </div>
                <div className={`text-xl ${isRed ? 'text-khel-red' : 'text-black'}`}>
                    {card.suit}
                </div>
            </div>
            
            {/* Matte Texture Only */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')]"></div>
        </div>

        {/* --- BACK FACE (Khel.fun Brand) --- */}
        <div 
            className={`${faceStyle} bg-[#001F3F] rotate-y-180 flex items-center justify-center overflow-hidden`}
        >
            {/* Diagonal Stripes Pattern - Matte */}
            <div className="absolute inset-[-50%]" 
                 style={{
                    backgroundImage: `repeating-linear-gradient(45deg, #001F3F 0, #001F3F 10px, #00FFFF 10px, #00FFFF 11px)`,
                    opacity: 0.1
                 }}>
            </div>
            
            {/* Logo - Centered */}
            <div className="relative w-full h-full flex items-center justify-center z-10">
                <div className="w-20 h-20 flex items-center justify-center bg-black/50 rounded-full border border-khel-cyan/30 shadow-sm p-2 transform -rotate-12">
                     <BrandLogo className="w-18 h-auto" variant="simple" />
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};