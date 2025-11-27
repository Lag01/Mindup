'use client';

import { useEffect } from 'react';

interface ImageOverlayProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageOverlay({ imageUrl, isOpen, onClose }: ImageOverlayProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="relative max-w-[90vw] max-h-[90vh]">
        {/* Bouton de fermeture */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-zinc-300 transition-colors"
          aria-label="Fermer"
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Image agrandie */}
        <img
          src={imageUrl}
          alt="Image agrandie"
          className="max-w-full max-h-[90vh] object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
