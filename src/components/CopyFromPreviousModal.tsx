// src/components/CopyFromPreviousModal.tsx
import { useState } from 'react';
import { Copy } from 'lucide-react';
import { Modal, Button } from './ui';

interface CopyFromPreviousModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (sourceMonth: string) => Promise<void>;
  currentMonth: string;
  availableMonths: string[];
}

export function CopyFromPreviousModal({ open, onClose, onConfirm, currentMonth, availableMonths }: CopyFromPreviousModalProps) {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  
  const previousMonths = availableMonths.filter(month => month < currentMonth);
  
  const handleCopy = async () => {
    if (!selectedMonth) return;
    setIsCopying(true);
    try {
      await onConfirm(selectedMonth);
      onClose();
    } finally {
      setIsCopying(false);
    }
  };
  
  return (
    <Modal open={open} onClose={onClose} title="Copy from Previous Month" size="md">
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
          <p>No data found for <strong>{currentMonth}</strong>.</p>
          <p className="mt-1">Would you like to copy data from a previous month?</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Select source month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] outline-none"
          >
            <option value="">-- Select a month --</option>
            {previousMonths.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" onClick={handleCopy} disabled={!selectedMonth || isCopying}>
            <Copy size={14} className="mr-1" />
            {isCopying ? 'Copying...' : 'Copy Data'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}