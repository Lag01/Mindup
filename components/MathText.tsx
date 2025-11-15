'use client';

import { useEffect, useRef, useState } from 'react';
import katex from 'katex';

interface MathTextProps {
  text: string;
  contentType: 'TEXT' | 'LATEX';
  className?: string;
  autoResize?: boolean;
  maxHeight?: number;
}

export default function MathText({
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
              fleqn: true, // Left-align equations to prevent overflow on mobile
              maxSize: 500, // Allow larger sizes but prevent excessive scaling
            });
          } catch (e) {
            // If display mode fails, try inline
            try {
              katex.render(text, containerRef.current, {
                displayMode: false,
                throwOnError: false,
                trust: true,
                fleqn: true,
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

      // Start with a reasonable font size
      let currentSize = 16;
      const minSize = 8;
      const maxSize = 24;

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
        overflow: autoResize ? (needsScroll ? 'auto' : 'hidden') : 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: needsScroll ? 'flex-start' : 'center',
        wordBreak: 'normal',
        overflowWrap: 'break-word',
        wordWrap: 'break-word',
        hyphens: 'auto',
        lineHeight: '1.5',
        padding: needsScroll ? '8px' : '0',
        width: '100%',
        boxSizing: 'border-box'
      }}
    />
  );
}
