/**
 * Toast Context
 *
 * Global toast notification system.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from '../components/atoms/Toast';

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showSuccess = useCallback((message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type: 'success' }]);
  }, []);

  const showError = useCallback((message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type: 'error' }]);
  }, []);

  const showInfo = useCallback((message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type: 'info' }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showInfo }}>
      {children}

      {/* Toast Container - Top Right */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
