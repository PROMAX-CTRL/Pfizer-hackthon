import React from 'react';
import { AlertCircle } from 'lucide-react';

export const Banner: React.FC = () => {
  return (
    <div 
      className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs sm:text-sm font-medium tracking-normal"
      role="region"
      aria-label="Prototype environment notice"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-center">
        <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" aria-hidden="true" />
        <span>
          Prototype • Fictional data only • Roles are simulated • Records are stored in this browser only
        </span>
      </div>
    </div>
  );
};
