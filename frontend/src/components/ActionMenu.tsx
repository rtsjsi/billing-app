import React, { useEffect, useRef, useState } from 'react';
import { MoreVertical, X } from 'lucide-react';

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface ActionMenuProps {
  isOpen: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onClose: () => void;
  items: ActionMenuItem[];
  title?: string;
}

export default function ActionMenu({ isOpen, onToggle, onClose, items, title = 'Actions' }: ActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [openUpward, setOpenUpward] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const isMobile = window.matchMedia('(max-width: 767px)').matches;

    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    if (isMobile) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
      if (isMobile) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const menuHeight = items.length * 40 + 16;
    const spaceBelow = window.innerHeight - rect.bottom;
    setOpenUpward(spaceBelow < menuHeight + 16);
  }, [isOpen, items.length]);

  const handleItemClick = (item: ActionMenuItem) => {
    if (item.disabled) return;
    onClose();
    item.onClick();
  };

  return (
    <div ref={menuRef} className="inline-block text-left relative">
      <button
        type="button"
        onClick={onToggle}
        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 transition-colors cursor-pointer"
        title="Actions"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {/* Desktop dropdown */}
      {isOpen && (
        <div
          className={`hidden md:block absolute right-0 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 ${
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          role="menu"
        >
          {items.map((item, index) => (
            <button
              type="button"
              key={index}
              role="menuitem"
              disabled={item.disabled}
              onClick={(e) => {
                e.stopPropagation();
                handleItemClick(item);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2.5 cursor-pointer disabled:opacity-50 ${
                item.variant === 'danger'
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Mobile bottom sheet */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
          />
          <div
            className="relative w-full max-w-lg bg-white rounded-t-2xl shadow-2xl animate-slide-up safe-area-bottom"
            role="menu"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="py-2">
              {items.map((item, index) => (
                <button
                  type="button"
                  key={index}
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(item);
                  }}
                  className={`w-full text-left px-5 py-3.5 text-base font-medium transition-colors flex items-center gap-3 cursor-pointer disabled:opacity-50 active:bg-slate-50 ${
                    item.variant === 'danger'
                      ? 'text-red-600'
                      : 'text-slate-800'
                  }`}
                >
                  <span className={item.variant === 'danger' ? 'text-red-500' : 'text-slate-500'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
