
import React from 'react';

interface LayerSliderProps {
  activeLayer: number;
  onChange: (layerIndex: number) => void;
}

export const LayerSlider: React.FC<LayerSliderProps> = ({ activeLayer, onChange }) => {
  // Layers 0 (Back) to 4 (Front)
  const layers = [4, 3, 2, 1, 0]; 

  return (
    <div className="w-full h-full flex flex-col items-center justify-center z-40 pointer-events-auto">
      {/* The slider bar itself */}
      <div className="w-full max-w-[2rem] h-80 bg-[var(--tool-bg)] rounded-full flex flex-col items-center justify-between py-6 border border-[var(--border-color)] relative">
        
        {layers.map((layerIndex) => (
          <button
            key={layerIndex}
            onClick={() => onChange(layerIndex)}
            className="relative z-10 w-8 h-8 flex items-center justify-center focus:outline-none appearance-none bg-transparent border-none p-0"
            title={`Layer ${layerIndex}`}
          >
             {/* Indicator Dot - purely scaling/coloring, no surrounding box */}
             <div 
                className={`
                    rounded-full transition-all duration-300 ease-out
                    ${activeLayer === layerIndex 
                        ? 'w-4 h-4 bg-[var(--active-color)]' 
                        : 'w-1.5 h-1.5 bg-[var(--slider-track)] hover:bg-[var(--active-color)] opacity-60 hover:opacity-100 hover:scale-150'
                    }
                `} 
             />
          </button>
        ))}
      </div>
    </div>
  );
};
