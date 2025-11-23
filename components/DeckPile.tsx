import React from 'react';

interface DeckPileProps {
  cardCount: number;
}

export const DeckPile: React.FC<DeckPileProps> = ({ cardCount }) => {
  // Visual limit for stack height (don't render 300 divs)
  const maxLayers = 16;
  const layerCount = Math.min(Math.ceil(cardCount / 8), maxLayers);

  if (cardCount === 0) {
      return (
         <div className="w-24 h-36 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center opacity-30">
            <span className="text-white text-[10px] tracking-widest uppercase">Shoe Empty</span>
         </div>
      );
  }

  // Calculate where to visually insert the cut card (yellow divider)
  const cutCardIndex = Math.max(1, Math.floor(layerCount * 0.3));
  const hasCutCard = cardCount > 15;

  return (
    <div className="relative w-24 h-36 group cursor-default z-0 transition-transform duration-300 hover:rotate-1 perspective-1000">
      
      {/* Base Shadow on Table */}
      <div className="absolute inset-0 bg-black/80 blur-xl rounded-xl translate-y-6 translate-x-4"></div>

      {/* Stack Construction */}
      {Array.from({ length: layerCount }).map((_, i) => {
         const isTop = i === layerCount - 1;
         const isCutCardLayer = hasCutCard && i === cutCardIndex;
         
         // Each layer is shifted slightly up and left to simulate 3D height
         const shift = i * 1.5; 

         return (
             <React.Fragment key={i}>
                {/* Yellow Cut Card Insert */}
                {isCutCardLayer && (
                    <div 
                        className="absolute w-32 h-24 bg-yellow-500 rounded shadow-md border border-yellow-600"
                        style={{
                            transform: `translate(${-shift + 25}px, ${-shift + 30}px) rotate(12deg)`,
                            zIndex: i
                        }}
                    >
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10"></div>
                    </div>
                )}

                {/* Card Layer */}
                <div
                    className={`absolute inset-0 rounded-xl border border-gray-300/40 shadow-sm transition-transform duration-300`}
                    style={{
                        transform: `translate(${-shift}px, ${-shift}px)`,
                        zIndex: i + 1, // Ensure cards are above cut card
                        backgroundColor: isTop ? '#1e3a8a' : '#f1f5f9', // Blue top, White paper sides
                    }}
                >
                    {/* Side Texture (Simulating layers of paper) */}
                    {!isTop && (
                        <div className="absolute inset-0 opacity-[0.07] bg-[repeating-linear-gradient(0deg,#000,#000_1px,transparent_1px,transparent_2px)]"></div>
                    )}

                    {/* Top Card Design (Matches CardComponent Back) */}
                    {isTop && (
                        <div className="w-full h-full relative overflow-hidden rounded-xl bg-[#1e3a8a]">
                            {/* Pattern */}
                            <div className="absolute inset-1 border border-white/10 rounded-lg m-0.5 opacity-90" 
                                style={{
                                    backgroundImage: `repeating-linear-gradient(45deg, #172554 0, #172554 4px, #1e3a8a 4px, #1e3a8a 8px)`,
                                }}>
                            </div>
                            
                            {/* Logo */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center border-2 border-white/20 shadow-inner z-10">
                                <span className="text-[10px] text-blue-200 font-bold tracking-wider">KF</span>
                            </div>

                            {/* Realistic Gloss/Sheen */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-black/20 pointer-events-none mix-blend-overlay"></div>
                            
                            {/* Border */}
                            <div className="absolute inset-0 border border-black/20 rounded-xl pointer-events-none"></div>
                        </div>
                    )}
                </div>
             </React.Fragment>
         );
      })}
    </div>
  );
};