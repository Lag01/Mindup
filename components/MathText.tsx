'use client';

import { useEffect, useRef, useState, memo } from 'react';
import katex from 'katex';

interface MathTextProps {
  text: string;
  contentType: 'TEXT' | 'LATEX';
  className?: string;
  autoResize?: boolean;
  maxHeight?: number;
}

// Cache global pour les tailles de police calculées
// Clé: "text_contentType_maxHeight" → Valeur: fontSize
const fontSizeCache = new Map<string, number>();

function MathText({
  text,
  contentType,
  className = '',
  autoResize = true,
  maxHeight = 400
}: MathTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(16);
  const [needsScroll, setNeedsScroll] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderContent = () => {
      if (!containerRef.current) return;

      try {
        // Clear previous content
        containerRef.current.innerHTML = '';

        if (contentType === 'LATEX') {
          // Render as LaTeX
          try {
            katex.render(text, containerRef.current, {
              displayMode: true,
              throwOnError: false,
              trust: true,
              fleqn: false, // Center equations for better visual alignment
              maxSize: 500, // Allow larger sizes but prevent excessive scaling
            });
          } catch (e) {
            // If display mode fails, try inline
            try {
              katex.render(text, containerRef.current, {
                displayMode: false,
                throwOnError: false,
                trust: true,
                fleqn: false,
                maxSize: 500,
              });
            } catch (e2) {
              // If both fail, display as text
              containerRef.current.textContent = text;
            }
          }
        } else {
          // Render as plain text
          containerRef.current.textContent = text;
        }
      } catch (error) {
        console.error('Error rendering content:', error);
        if (containerRef.current) {
          containerRef.current.textContent = text;
        }
      }
    };

    const adjustFontSize = () => {
      if (!containerRef.current || !autoResize) return;

      // Générer clé de cache basée sur le contenu
      const cacheKey = `${text.substring(0, 100)}_${contentType}_${maxHeight}`;

      // Vérifier si la taille est déjà en cache
      const cachedSize = fontSizeCache.get(cacheKey);
      if (cachedSize !== undefined) {
        // Utiliser la taille en cache - évite la recherche binaire !
        containerRef.current.style.fontSize = `${cachedSize}px`;
        setFontSize(cachedSize);
        renderContent();

        // Vérifier si le contenu déborde
        const finalScrollHeight = containerRef.current.scrollHeight;
        const finalScrollWidth = containerRef.current.scrollWidth;
        const finalClientWidth = containerRef.current.clientWidth;
        setNeedsScroll(finalScrollHeight > maxHeight || finalScrollWidth > finalClientWidth);
        return;
      }

      // Pas en cache : effectuer la recherche binaire
      let currentSize = 14;
      const minSize = 11;
      const maxSize = 20;

      // Binary search for optimal font size with more iterations for precision
      let low = minSize;
      let high = maxSize;
      let bestSize = currentSize;
      const maxIterations = 20; // Increase iterations for better accuracy
      let iteration = 0;

      while (low <= high && iteration < maxIterations) {
        currentSize = Math.floor((low + high) / 2);
        containerRef.current.style.fontSize = `${currentSize}px`;

        renderContent();

        // Wait a tick for KaTeX to fully render before measuring
        const scrollHeight = containerRef.current.scrollHeight;
        const scrollWidth = containerRef.current.scrollWidth;
        const clientWidth = containerRef.current.clientWidth;

        // Check both height and width overflow
        const hasOverflow = scrollHeight > maxHeight || scrollWidth > clientWidth;

        if (!hasOverflow) {
          bestSize = currentSize;
          low = currentSize + 1;
        } else {
          high = currentSize - 1;
        }

        iteration++;
      }

      // Mettre en cache la taille calculée
      fontSizeCache.set(cacheKey, bestSize);

      setFontSize(bestSize);
      containerRef.current.style.fontSize = `${bestSize}px`;

      // Check if content still overflows even at minimum size
      renderContent();
      const finalScrollHeight = containerRef.current.scrollHeight;
      const finalScrollWidth = containerRef.current.scrollWidth;
      const finalClientWidth = containerRef.current.clientWidth;
      setNeedsScroll(finalScrollHeight > maxHeight || finalScrollWidth > finalClientWidth);
    };

    if (autoResize) {
      adjustFontSize();
    } else {
      renderContent();
    }
  }, [text, contentType, autoResize, maxHeight]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        fontSize: autoResize ? `${fontSize}px` : undefined,
        maxHeight: autoResize ? `${maxHeight}px` : undefined,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        whiteSpace: 'pre-wrap',
        lineHeight: '1.5',
        padding: '8px 8px 8px 16px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    />
  );
}

// Mémoriser le composant pour éviter les re-renders inutiles lors de révisions
// Ne re-render que si text ou contentType changent
export default memo(MathText);
