import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, children }) => {
  // Handle ESC key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Use portal to render modal at document root
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-88px)]">
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};
