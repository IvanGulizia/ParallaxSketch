import React from 'react';

interface LayerSliderProps {
  activeLayer: number;
  onChange: (layerIndex: number) => void;
}

export const LayerSlider: React.FC<LayerSliderProps> = ({ activeLayer, onChange }) => {
  // Layers 0 (Back) to 4 (Front)
  const layers = [4, 3, 2, 1, 0]; 

  return (
    <div className="h-full flex flex-col items-center justify-center z-40 pointer-events-auto">
      <div className="h-80 w-12 bg-[var(--tool-bg)] rounded-full flex flex-col items-center justify-between py-6 shadow-sm border border-white/50 relative">
        
        {/* Track Line */}
        <div className="absolute top-6 bottom-6 w-0.5 bg-[var(--accent-color)] z-0" />

        {layers.map((layerIndex) => (
          <button
            key={layerIndex}
            onClick={() => onChange(layerIndex)}
            className={`
              relative z-10 w-8 h-8 rounded-full border-2 transition-all duration-300 ease-in-out
              flex items-center justify-center group
              ${activeLayer === layerIndex 
                ? 'bg-[var(--primary-bg)] border-[var(--active-color)] scale-125 shadow-sm' 
                : 'bg-[var(--secondary-bg)] border-transparent hover:bg-[var(--accent-color)]'}
            `}
            title={`Layer ${layerIndex}`}
          >
             <div className={`w-2 h-2 rounded-full transition-colors ${activeLayer === layerIndex ? 'bg-[var(--active-color)]' : 'bg-gray-300'}`} />
          </button>
        ))}
      </div>
    </div>
  );
};
