import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border-t sm:border border-gray-200 max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4 sm:mb-5 sticky top-0 bg-white -mx-5 sm:-mx-6 px-5 sm:px-6 py-3 sm:py-0 border-b sm:border-b-0 border-gray-200">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition p-1"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
