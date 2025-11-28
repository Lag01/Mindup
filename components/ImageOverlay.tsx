'use client';

import { useEffect } from 'react';
import { useImageZoom } from '@/hooks/useImageZoom';

interface ImageOverlayProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageOverlay({ imageUrl, isOpen, onClose }: ImageOverlayProps) {
  const {
    scale,
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    zoomIn,
    zoomOut,
    resetZoom,
    imageStyle,
    isDragging
  } = useImageZoom();

  // Reset du zoom quand on ferme l'overlay
  useEffect(() => {
    if (!isOpen) {
      resetZoom();
    }
  }, [isOpen, resetZoom]);

  // Gestion touche Échap
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
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Bouton de fermeture (haut droite) */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white hover:text-zinc-300 transition-colors z-10"
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

      {/* Contrôles de zoom (bas droite) */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); zoomIn(); }}
          className="bg-zinc-800 hover:bg-zinc-700 text-white w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
          aria-label="Zoomer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); zoomOut(); }}
          className="bg-zinc-800 hover:bg-zinc-700 text-white w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
          aria-label="Dézoomer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); resetZoom(); }}
          className="bg-zinc-800 hover:bg-zinc-700 text-white w-10 h-10 rounded-lg flex items-center justify-center text-xs transition-colors"
          aria-label="Réinitialiser"
        >
          1:1
        </button>
        <div className="bg-zinc-800 text-white px-2 py-1 rounded text-xs text-center">
          {Math.round(scale * 100)}%
        </div>
      </div>

      {/* Container de l'image avec overflow hidden */}
      <div
        className="relative w-[90vw] h-[90vh] overflow-hidden"
        onWheel={onWheel}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Image agrandie"
          style={imageStyle}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className={`max-w-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          draggable={false}
        />
      </div>
    </div>
  );
}
