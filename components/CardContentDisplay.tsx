'use client';

import MathText from './MathText';

interface CardContentDisplayProps {
  text: string;
  textType: 'TEXT' | 'LATEX';
  imagePath: string | null;
  className?: string;
  autoResize?: boolean;
  maxHeight?: number;
  onImageClick?: (imageUrl: string) => void;
}

export default function CardContentDisplay({
  text,
  textType,
  imagePath,
  className = '',
  autoResize = true,
  maxHeight = 400,
  onImageClick,
}: CardContentDisplayProps) {
  const hasText = text && text.trim().length > 0;
  const hasImage = imagePath && imagePath.length > 0;

  // Cas 1 : Image seule (pas de texte)
  if (hasImage && !hasText) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <img
          src={imagePath}
          alt="Contenu de la carte"
          className="max-w-full max-h-full object-contain cursor-pointer hover:opacity-80 transition-opacity"
          style={{ maxHeight: `${maxHeight}px` }}
          onClick={() => onImageClick?.(imagePath)}
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
    const textMaxHeight = Math.floor(maxHeight * 0.4); // 40% pour le texte
    const imageMaxHeight = Math.floor(maxHeight * 0.6); // 60% pour l'image

    return (
      <div className={`flex flex-col gap-3 ${className}`}>
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
        <div className="flex-shrink-0 flex items-center justify-center">
          <img
            src={imagePath}
            alt="Illustration de la carte"
            className="max-w-full object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
            style={{ maxHeight: `${imageMaxHeight}px` }}
            onClick={() => onImageClick?.(imagePath)}
          />
        </div>
      </div>
    );
  }

  // Cas par défaut : rien à afficher
  return null;
}
