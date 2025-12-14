'use client';

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Toast, { ToastType } from '@/components/Toast';

interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastInstance extends ToastConfig {
  id: string;
}

/**
 * Hook pour afficher des notifications toast
 * Remplace les alert() par des notifications élégantes
 *
 * @returns Objet contenant les fonctions toast et le composant ToastContainer
 *
 * @example
 * function MyComponent() {
 *   const { success, error, warning, info, ToastContainer } = useToast();
 *
 *   const handleSave = async () => {
 *     try {
 *       await saveData();
 *       success('Données sauvegardées !');
 *     } catch (err) {
 *       error('Erreur lors de la sauvegarde');
 *     }
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={handleSave}>Sauvegarder</button>
 *       <ToastContainer />
 *     </>
 *   );
 * }
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastInstance[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((config: ToastConfig) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast: ToastInstance = { ...config, id };

    setToasts(prev => [...prev, toast]);
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'success', duration });
  }, [showToast]);

  const error = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'error', duration });
  }, [showToast]);

  const warning = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'warning', duration });
  }, [showToast]);

  const info = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'info', duration });
  }, [showToast]);

  const ToastContainer = useCallback(() => {
    if (typeof window === 'undefined') return null;

    return createPortal(
      <>
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            style={{
              position: 'fixed',
              top: `${16 + index * 80}px`,
              right: '16px',
              zIndex: 9999,
            }}
          >
            <Toast
              message={toast.message}
              type={toast.type}
              duration={toast.duration}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </>,
      document.body
    );
  }, [toasts, removeToast]);

  return {
    success,
    error,
    warning,
    info,
    toast: showToast,
    ToastContainer,
  };
}
