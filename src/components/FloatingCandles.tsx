import React from 'react';
import { motion } from 'motion/react';

export const FloatingCandles = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {/* Container for glowing effect */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-orange-500/20 via-transparent to-transparent"></div>
      
      {/* Bottom Right Primary Candle */}
      <Candle size="lg" className="absolute bottom-4 right-8 md:bottom-8 md:right-12 opacity-90 delay-100" />
    </div>
  );
};

const Candle = ({ className, size = "md" }: { className?: string, size?: "sm" | "md" | "lg" | "xl" }) => {
  const dimensions = {
    sm: { width: 'w-3', height: 'h-8', flame: 'w-2 h-4', wick: 'h-1' },
    md: { width: 'w-4', height: 'h-12', flame: 'w-2.5 h-5', wick: 'h-1.5' },
    lg: { width: 'w-6', height: 'h-16', flame: 'w-3.5 h-7', wick: 'h-2' },
    xl: { width: 'w-8', height: 'h-24', flame: 'w-4 h-8', wick: 'h-2.5' },
  }[size];

  // Randomize the animation offset so they don't flicker in perfect sync
  const durationOffset = Math.random() * 0.5;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Glow backdrop */}
      <motion.div 
        animate={{ opacity: [0.2, 0.4, 0.3, 0.5, 0.2], scale: [1, 1.1, 0.95, 1.05, 1] }} 
        transition={{ repeat: Infinity, duration: 3 + durationOffset, ease: "easeInOut" }}
        className={`absolute top-0 bg-orange-500/40 rounded-full blur-2xl w-32 h-32 -translate-y-1/2`} 
      />
      
      {/* Flame */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 0.9, 1.15, 1],
          rotate: [0, -3, 3, -1, 0],
          borderRadius: ["50% 50% 20% 20%", "50% 50% 30% 30%", "50% 50% 20% 20%"]
        }}
        transition={{ repeat: Infinity, duration: 0.8 + durationOffset, ease: "easeInOut" }}
        className={`${dimensions.flame} bg-gradient-to-t from-orange-500 via-yellow-400 to-yellow-100 rounded-t-full rounded-b-md blur-[0.5px] relative origin-bottom shadow-[0_0_15px_rgba(251,146,60,0.6)]`} 
      >
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1/2 bg-white/80 rounded-full blur-[1px]"></div>
      </motion.div>
      
      {/* Wick */}
      <div className={`w-[2px] ${dimensions.wick} bg-zinc-900 rounded-t-full relative -top-[1px] z-10`}></div>
      
      {/* Body */}
      <div className={`${dimensions.width} ${dimensions.height} bg-gradient-to-t from-zinc-900 via-zinc-400 to-[#e8e4dc] rounded-sm shadow-2xl relative overflow-hidden ring-1 ring-white/10`}>
         <div className="absolute top-0 w-full h-2 bg-gradient-to-b from-orange-500/60 to-transparent"></div>
         <div className="absolute top-0 right-0 w-1.5 h-full bg-white/30 blur-[1px] rounded-full mix-blend-overlay"></div>
         {/* Dripping wax */}
         <div className={`absolute top-0 -left-0.5 ${size === 'lg' ? 'w-2 h-4' : 'w-1 h-2'} bg-[#e8e4dc]/90 rounded-b-full shadow-sm`}></div>
      </div>
    </div>
  );
}
