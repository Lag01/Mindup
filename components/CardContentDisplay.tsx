'use client';

import { useState } from 'react';
import Image from 'next/image';
import MathText from './MathText';
import { addCacheBusting } from '@/lib/image-service';

// Ratios de distribution de l'espace pour texte+image
const TEXT_HEIGHT_RATIO = 0.5;  // 50% pour le texte
const IMAGE_HEIGHT_RATIO = 0.5; // 50% pour l'image

interface CardContentDisplayProps {
  text: string;
  textType: 'TEXT' | 'LATEX';
  imagePath: string | null;
  className?: string;
  autoResize?: boolean;
  maxHeight?: number;
  onImageClick?: (imageUrl: string) => void;
  imageAlt?: string;
}

export default function CardContentDisplay({
  text,
  textType,
  imagePath,
  className = '',
  autoResize = true,
  maxHeight = 400,
  onImageClick,
  imageAlt,
}: CardContentDisplayProps) {
  // Timestamp de session pour cache busting (évite les re-renders)
  const [sessionTimestamp] = useState(() => Date.now());

  const hasText = text && text.trim().length > 0;
  const hasImage = imagePath && imagePath.length > 0;

  // Cas 1 : Image seule (pas de texte)
  if (hasImage && !hasText) {
    return (
      <div className={`relative ${className}`} style={{ width: '100%', height: `${maxHeight}px` }}>
        <Image
          src={addCacheBusting(imagePath, sessionTimestamp) || imagePath}
          alt={imageAlt ?? (text ? `Illustration : ${text.slice(0, 60)}` : 'Image de la carte')}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onImageClick?.(imagePath);
          }}
        />
      </div>
    );
  }

  // Cas 2 : Texte seul (pas d'image) - Utiliser MathText comme avant
  if (hasText && !hasImage) {
    return (
      <MathText
        text={text}
        contentType={textType}
        className={className}
        autoResize={autoResize}
        maxHeight={maxHeight}
      />
    );
  }

  // Cas 3 : Texte + Image - Afficher les deux
  if (hasText && hasImage) {
    const textMaxHeight = Math.floor(maxHeight * TEXT_HEIGHT_RATIO);
    const imageMaxHeight = Math.floor(maxHeight * IMAGE_HEIGHT_RATIO);

    return (
      <div
        className={`flex flex-col gap-3 ${className}`}
        style={{
          maxHeight: `${maxHeight}px`,
          overflow: 'auto',
          width: '100%',
          maxWidth: '100%',
        }}
      >
        {/* Texte en haut */}
        <div className="flex-shrink-0">
          <MathText
            text={text}
            contentType={textType}
            className={className}
            autoResize={autoResize}
            maxHeight={textMaxHeight}
          />
        </div>

        {/* Image en bas */}
        <div className="flex-shrink-0 relative" style={{ width: '100%', height: `${imageMaxHeight}px` }}>
          <Image
            src={addCacheBusting(imagePath, sessionTimestamp) || imagePath}
            alt={imageAlt ?? (text ? `Illustration : ${text.slice(0, 60)}` : 'Illustration de la carte')}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onImageClick?.(imagePath);
            }}
          />
        </div>
      </div>
    );
  }

  // Cas par défaut : rien à afficher
  return null;
}
