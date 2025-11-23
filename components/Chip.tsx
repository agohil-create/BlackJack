import React from 'react';
import { ChipValue } from '../types';

interface ChipProps {
  chip: ChipValue;
  onClick?: () => void;
  disabled?: boolean;
  count?: number;
}

export const Chip: React.FC<ChipProps> = ({ chip, onClick, disabled, count }) => {
  // Map base colors to a gradient for 3D effect
  const getGradient = (colorClass: string) => {
    if (colorClass.includes('red')) return 'from-red-500 to-red-700';
    if (colorClass.includes('green')) return 'from-green-500 to-green-700';
    if (colorClass.includes('black')) return 'from-gray-800 to-black';
    if (colorClass.includes('purple')) return 'from-purple-600 to-purple-900';
    return 'from-gray-400 to-gray-600';
  };

  const getEdgeColor = (colorClass: string) => {
     if (colorClass.includes('red')) return '#991b1b'; // red-800
     if (colorClass.includes('green')) return '#166534'; // green-800
     if (colorClass.includes('black')) return '#000000';
     if (colorClass.includes('purple')) return '#581c87'; // purple-900
     return '#4b5563';
  };

  const gradient = getGradient(chip.color);
  const edgeColor = getEdgeColor(chip.color);

  // Generate edge spots using conic gradient
  const spotsStyle = {
      background: `conic-gradient(
          ${edgeColor} 0deg 20deg, 
          white 20deg 40deg, 
          ${edgeColor} 40deg 70deg,
          white 70deg 90deg,
          ${edgeColor} 90deg 110deg,
          white 110deg 130deg,
          ${edgeColor} 130deg 160deg,
          white 160deg 180deg,
          ${edgeColor} 180deg 200deg,
          white 200deg 220deg,
          ${edgeColor} 220deg 250deg,
          white 250deg 270deg,
          ${edgeColor} 270deg 290deg,
          white 290deg 310deg,
          ${edgeColor} 310deg 340deg,
          white 340deg 360deg
      )`
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative group flex flex-col items-center justify-center transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:-translate-y-1 cursor-pointer active:scale-95'}
      `}
    >
      {/* Shadow */}
      <div className="absolute top-1 left-1 w-16 h-16 rounded-full bg-black/60 blur-[2px] transition-all"></div>

      {/* Main Chip Body */}
      <div 
        className={`
          relative w-16 h-16 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.5)]
          flex items-center justify-center overflow-hidden
        `}
      >
          {/* Edge Spots Pattern */}
          <div className="absolute inset-0" style={spotsStyle}></div>
          
          {/* Tint Overlay for Color */}
          <div className={`absolute inset-0 opacity-90 bg-gradient-to-br ${gradient} mix-blend-multiply`}></div>

          {/* Inner Recess (Inlay) */}
          <div className="relative w-11 h-11 rounded-full bg-[#fdfbf7] shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] flex items-center justify-center border border-gray-300">
             {/* Decorative Ring */}
             <div className="absolute inset-1 rounded-full border border-dashed border-gray-400 opacity-50"></div>
             
             {/* Value */}
             <div className={`font-black text-sm tracking-tighter drop-shadow-sm ${
                 chip.value >= 100 ? 'text-black' : 
                 chip.value >= 25 ? 'text-green-800' :
                 chip.value >= 5 ? 'text-red-800' : 'text-gray-800'
             }`}>
                ${chip.value}
             </div>
          </div>
      </div>

      {count !== undefined && count > 0 && (
         <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-white shadow-lg z-10">
           {count}
         </div>
      )}
    </button>
  );
};