import React from 'react';
import { cn } from '../utils/cn';

export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cn('bg-white rounded-xl border border-slate-200 shadow-sm', onClick && 'cursor-pointer', className)}>{children}</div>
  );
}

export function StatCard({ title, value, icon: Icon, change, accent, sub }:
  { title: string; value: string; icon?: any; change?: string; accent?: 'gold' | 'navy' | 'green' | 'red' | 'blue'; sub?: string }) {
  const colorMap: Record<string, string> = {
    gold: 'bg-[#FFF9E5] text-[#D4A017]',
    navy: 'bg-[#E8EDF5] text-[#081C3A]',
    green: 'bg-[#E6F7F0] text-[#10B981]',
    red: 'bg-[#FEECEC] text-[#EF4444]',
    blue: 'bg-[#E6EFFB] text-[#3B82F6]'
  };
  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-slate-800 mt-2 tracking-tight">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
          {change && <p className="text-xs text-[#10B981] mt-2 font-medium">{change}</p>}
        </div>
        {Icon && (
          <div className={cn('w-11 h-11 rounded-lg flex items-center justify-center', colorMap[accent || 'navy'])}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </Card>
  );
}

export function Button({ children, onClick, variant = 'primary', className = '', type = 'button', disabled }:
  { children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success'; className?: string; type?: 'button' | 'submit'; disabled?: boolean }) {
  const variants = {
    primary: 'bg-[#081C3A] text-white hover:bg-[#1a2f5c] shadow-sm',
    secondary: 'bg-[#D4A017] text-white hover:bg-[#e8b82e] shadow-sm',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
    outline: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700'
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn('inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed', variants[variant], className)}
    >
      {children}
    </button>
  );
}

export function Badge({ children, color = 'navy' }: { children: React.ReactNode; color?: 'navy' | 'gold' | 'green' | 'red' | 'blue' | 'gray' | 'yellow' }) {
  const map: Record<string, string> = {
    navy: 'bg-[#081C3A] text-white',
    gold: 'bg-[#FFF1CC] text-[#8B6F0F]',
    green: 'bg-[#DCFCE7] text-[#166534]',
    red: 'bg-[#FEE2E2] text-[#991B1B]',
    blue: 'bg-[#DBEAFE] text-[#1E40AF]',
    gray: 'bg-slate-100 text-slate-700',
    yellow: 'bg-[#FEF3C7] text-[#854D0E]'
  };
  return <span className={cn('inline-flex items-center px-2 py-1 text-xs font-medium rounded-md', map[color])}>{children}</span>;
}

export function Input({ label, type = 'text', value, defaultValue, onChange, placeholder, className = '', required, icon: Icon }:
  { label?: string; type?: string; value?: any; defaultValue?: any; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; className?: string; required?: boolean; icon?: any }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>}
      <div className="relative">
        {Icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon size={16} /></div>}
        <input
          type={type}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={cn('w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] focus:border-transparent outline-none bg-white', Icon && 'pl-10')}
        />
      </div>
    </div>
  );
}

export function Select({ label, value, onChange, options, className = '' }:
  { label?: string; value?: any; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: { label: string; value: string }[]; className?: string }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <select value={value} onChange={onChange} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] focus:border-transparent outline-none bg-white">
        {options.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
      </select>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }:
  { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">{title}</h1>
        {subtitle && <p className="text-slate-500 mt-1 text-sm md:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Table({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-slate-200 bg-white', className)}>
      <table className="w-full text-sm">
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-[#F8FAFC] text-left text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
      {children}
    </thead>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function TR({ children, hover = true, onClick, className = '' }: { children: React.ReactNode; hover?: boolean; onClick?: () => void; className?: string }) {
  return (
    <tr
      onClick={onClick}
      className={cn(hover && 'hover:bg-slate-50', onClick && 'cursor-pointer', 'transition-colors', className)}
    >{children}</tr>
  );
}

export function TH({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={cn('px-4 py-3 font-semibold whitespace-nowrap', className)}>{children}</th>;
}

export function TD({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 text-slate-700 whitespace-nowrap', className)}>{children}</td>;
}

export function Modal({ open, onClose, title, children, size = 'md' }:
  { open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  if (!open) return null;
  const sizes: Record<string, string> = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in sm:p-4 pb-safe" onClick={onClose}>
      <div className={cn('bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-hidden flex flex-col sm:rounded-lg', sizes[size])} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 max-h-[calc(90vh-120px)]">{children}</div>
      </div>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }:
  { tabs: { id: string; label: string; icon?: any }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200 mb-6 -mx-1 px-1">
      {tabs.map(t => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
              isActive ? 'border-[#081C3A] text-[#081C3A]' : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            {Icon && <Icon size={16} />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }:
  { icon?: any; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-12 px-6">
      {Icon && <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-4"><Icon size={28} /></div>}
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      {description && <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
