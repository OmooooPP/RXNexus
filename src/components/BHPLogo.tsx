import React from 'react';

interface BHPLogoProps {
  className?: string;
  iconOnly?: boolean;
}

export default function BHPLogo({ className = '', iconOnly = false }: BHPLogoProps) {
  // Determine if it should be rendered in the large auth-gate format
  const isLarge = className.includes('h-16') || className.includes('text-lg') || className.includes('h-12');

  return (
    <div className={`flex flex-col select-none font-sans ${isLarge ? 'items-center text-center' : 'items-start text-left'}`}>
      {/* Upper Brand Name */}
      <div className="flex items-center gap-1.5 leading-none">
        <span className={`${isLarge ? 'text-xl sm:text-2xl' : 'text-sm sm:text-[14px]'} font-extrabold tracking-tight text-slate-800`}>
          BANGKOK
        </span>
        <span className={`${isLarge ? 'text-xl sm:text-2xl' : 'text-sm sm:text-[14px]'} font-extrabold tracking-tight text-[#003E80]`}>
          HOSPITAL
        </span>
      </div>
      
      {/* Decorative colored line divider (Red & Blue) */}
      <div className={`flex h-[2px] rounded-full overflow-hidden mt-1 bg-slate-100 ${isLarge ? 'w-24' : 'w-12'}`}>
        <div className="w-1/2 bg-[#B21E29]"></div>
        <div className="w-1/2 bg-[#003E80]"></div>
      </div>

      {/* Pattaya Subtext at the bottom */}
      <span className={`${isLarge ? 'text-[10px] sm:text-[11px] tracking-[0.35em] font-extrabold text-slate-500 mt-1.5' : 'text-[7.5px] sm:text-[8px] tracking-[0.25em] font-bold text-slate-500 mt-1'} uppercase leading-none`}>
        PATTAYA
      </span>
    </div>
  );
}
