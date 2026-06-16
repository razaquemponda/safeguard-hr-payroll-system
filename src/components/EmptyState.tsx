// src/components/EmptyState.tsx
import { Calendar, Database, Plus } from 'lucide-react';
import { Button } from './ui';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: 'calendar' | 'database';
}

export function EmptyState({ title, message, actionLabel, onAction, icon = 'calendar' }: EmptyStateProps) {
  const Icon = icon === 'calendar' ? Calendar : Database;
  
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <Icon size={32} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      <p className="text-slate-500 mt-2 max-w-md">{message}</p>
      {actionLabel && onAction && (
        <Button variant="outline" className="mt-4" onClick={onAction}>
          <Plus size={14} className="mr-1" /> {actionLabel}
        </Button>
      )}
    </div>
  );
}