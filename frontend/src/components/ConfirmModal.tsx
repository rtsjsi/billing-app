import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const iconColor = variant === 'danger' ? 'text-red-500' : variant === 'warning' ? 'text-amber-500' : 'text-brand-600';
  const iconBg = variant === 'danger' ? 'bg-red-50' : variant === 'warning' ? 'bg-amber-50' : 'bg-brand-50';
  const confirmClass = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : variant === 'warning'
    ? 'bg-amber-600 hover:bg-amber-700 text-white'
    : 'btn-primary';

  const footer = (
    <>
      <button type="button" className="btn-secondary flex-1 sm:flex-none" onClick={onCancel}>
        {cancelText}
      </button>
      <button type="button" className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${confirmClass}`} onClick={onConfirm}>
        {confirmText}
      </button>
    </>
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onCancel} aria-hidden="true" />

      {/* Mobile bottom sheet */}
      <div
        ref={modalRef}
        className="md:hidden relative w-full bottom-sheet animate-slide-up safe-area-bottom"
        role="dialog"
        aria-modal="true"
      >
        <div className="bottom-sheet-handle" />
        <div className="px-5 py-5">
          <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center mb-4`}>
            <AlertTriangle className={`h-6 w-6 ${iconColor}`} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 mt-2">{message}</p>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
          {footer}
        </div>
      </div>

      {/* Desktop centered modal */}
      <div
        ref={modalRef}
        className="hidden md:block relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in mx-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="px-6 py-6 flex gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
            <AlertTriangle className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{message}</p>
          </div>
          <button type="button" className="btn-icon w-9 h-9 shrink-0" onClick={onCancel}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          {footer}
        </div>
      </div>
    </div>
  );
}
