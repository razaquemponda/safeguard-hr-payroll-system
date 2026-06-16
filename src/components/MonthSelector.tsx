// src/components/MonthSelector.tsx
import { useState } from 'react';
import { Calendar, Loader2, AlertCircle } from 'lucide-react';

interface MonthSelectorProps {
  selectedMonth: string;
  onMonthChange: (month: string) => Promise<void>;
  availableMonths: string[];
  isLoading?: boolean;
}

export function MonthSelector({ selectedMonth, onMonthChange, availableMonths, isLoading }: MonthSelectorProps) {
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = e.target.value;
    if (newMonth === selectedMonth) return;
    
    setIsChanging(true);
    setError(null);
    
    try {
      await onMonthChange(newMonth);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <select
          value={selectedMonth}
          onChange={handleChange}
          disabled={isChanging || isLoading}
          className="px-3 py-2 pr-8 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] outline-none bg-white disabled:opacity-50"
        >
          {availableMonths.map(month => (
            <option key={month} value={month}>{month}</option>
          ))}
        </select>
        <Calendar size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
      
      {isChanging && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 size={14} className="animate-spin" />
          Loading...
        </div>
      )}
      
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );
}