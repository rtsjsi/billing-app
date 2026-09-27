import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export default function MobileModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-lg',
}: MobileModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const desktopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile: bottom sheet */}
      <div
        ref={sheetRef}
        className={`md:hidden relative w-full bottom-sheet animate-slide-up safe-area-bottom`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="bottom-sheet-handle" />
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 id="modal-title" className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon w-9 h-9"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex gap-2 justify-end safe-area-bottom">
            {footer}
          </div>
        )}
      </div>

      {/* Desktop: centered modal */}
      <div
        ref={desktopRef}
        className={`hidden md:block relative w-full ${maxWidth} bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in mx-4`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon w-9 h-9"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
