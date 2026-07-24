import React from 'react';

interface SpinnerProps {
  className?: string;
  label?: string;
}

export default function Spinner({ className = '', label }: SpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      {label && (
        <p className="text-slate-500 text-xs font-medium tracking-wide">{label}</p>
      )}
      <span className="sr-only">Loading</span>
    </div>
  );
}
