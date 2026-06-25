// src/components/PageLoader.tsx

import { Loader2 } from 'lucide-react';

export const PageLoader = () => {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={32} className="text-[#D4A017] animate-spin" />
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  );
};