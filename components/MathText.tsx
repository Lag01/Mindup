'use client';

import { useEffect, useRef, useState, memo } from 'react';
import katex from 'katex';

// Configuration du redimensionnement automatique de police
const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 11;
const MAX_FONT_SIZE = 20;
const MAX_BINARY_SEARCH_ITERATIONS = 20;
const CONTENT_PADDING = '12px';

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

/**
 * Vérifie si le contenu déborde horizontalement ou verticalement
 */
function checkOverflow(element: HTMLElement, maxHeight: number): boolean {
  return element.scrollHeight > maxHeight ||
         element.scrollWidth > element.clientWidth;
}

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
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderContent = () => {
      if (!containerRef.current) return;

      try {
        // Clear previous content
        containerRef.current.innerHTML = '';
        setHasError(false);

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
              setHasError(true);
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
        setHasError(true);
      }
    };

    const adjustFontSize = () => {
      if (!containerRef.current || !autoResize) return;

      // Générer clé de cache basée sur le contenu (début + fin pour éviter collisions)
      const cacheKey = `${contentType}_${maxHeight}_${text.length}_${text.substring(0, 50)}_${text.slice(-50)}`;

      // Vérifier si la taille est déjà en cache
      const cachedSize = fontSizeCache.get(cacheKey);
      if (cachedSize !== undefined) {
        // Utiliser la taille en cache - évite la recherche binaire !
        containerRef.current.style.fontSize = `${cachedSize}px`;
        setFontSize(cachedSize);
        renderContent();

        // Vérifier si le contenu déborde
        setNeedsScroll(checkOverflow(containerRef.current, maxHeight));
        return;
      }

      // Pas en cache : effectuer la recherche binaire
      let currentSize = DEFAULT_FONT_SIZE;
      const minSize = MIN_FONT_SIZE;
      const maxSize = MAX_FONT_SIZE;

      // Binary search for optimal font size with more iterations for precision
      let low = minSize;
      let high = maxSize;
      let bestSize = currentSize;
      const maxIterations = MAX_BINARY_SEARCH_ITERATIONS; // Increase iterations for better accuracy
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
      setNeedsScroll(checkOverflow(containerRef.current, maxHeight));
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
      className={`${className} ${needsScroll ? 'needs-scroll' : ''} ${hasError ? 'border border-red-500/30 bg-red-900/10' : ''}`}
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
        padding: CONTENT_PADDING,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        ...(needsScroll && {
          scrollbarColor: '#3f3f46 transparent',
          scrollbarWidth: 'thin',
        }),
      }}
    />
  );
}

// Mémoriser le composant pour éviter les re-renders inutiles lors de révisions
// Ne re-render que si text ou contentType changent
export default memo(MathText);
