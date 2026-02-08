'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!mounted) return null;
  
  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
    >
      {/* Overlay click to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="bg-admin-card w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-admin-border relative z-10 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
        <div className="flex items-center justify-between p-6 border-b border-admin-border shrink-0">
          <h2 className="text-xl font-bold text-admin-text">{title}</h2>
          <button
            onClick={onClose}
            className="text-admin-muted hover:text-admin-text transition-colors p-2 hover:bg-admin-bg rounded-lg"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
