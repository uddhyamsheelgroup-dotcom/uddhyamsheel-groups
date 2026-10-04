import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  trend?: string;
  accentColor?: 'navy' | 'cyan' | 'gold' | 'emerald' | 'rose' | 'indigo' | 'amber';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  accentColor = 'navy',
  onClick
}) => {
  const colorStyles: Record<string, { badge: string; border: string; glow: string }> = {
    navy: {
      badge: 'text-[#002984] bg-blue-50 border border-blue-200/60',
      border: 'border-t-2 border-t-[#002984]',
      glow: 'group-hover:border-blue-400'
    },
    cyan: {
      badge: 'text-cyan-700 bg-cyan-50 border border-cyan-200/60',
      border: 'border-t-2 border-t-cyan-500',
      glow: 'group-hover:border-cyan-400'
    },
    gold: {
      badge: 'text-amber-800 bg-amber-50 border border-amber-200/60',
      border: 'border-t-2 border-t-amber-500',
      glow: 'group-hover:border-amber-400'
    },
    emerald: {
      badge: 'text-emerald-800 bg-emerald-50 border border-emerald-200/60',
      border: 'border-t-2 border-t-emerald-500',
      glow: 'group-hover:border-emerald-400'
    },
    rose: {
      badge: 'text-rose-800 bg-rose-50 border border-rose-200/60',
      border: 'border-t-2 border-t-rose-500',
      glow: 'group-hover:border-rose-400'
    },
    indigo: {
      badge: 'text-indigo-800 bg-indigo-50 border border-indigo-200/60',
      border: 'border-t-2 border-t-indigo-500',
      glow: 'group-hover:border-indigo-400'
    },
    amber: {
      badge: 'text-amber-900 bg-amber-50/80 border border-amber-300/60',
      border: 'border-t-2 border-t-amber-600',
      glow: 'group-hover:border-amber-500'
    }
  };

  const style = colorStyles[accentColor] || colorStyles.navy;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all group ${style.border} ${style.glow} ${
        onClick ? 'cursor-pointer hover:border-slate-300' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-mono">{value}</h3>
          {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
        </div>
        <div className={`p-2.5 rounded-xl shadow-xs transition-transform group-hover:scale-105 ${style.badge}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};
