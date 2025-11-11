'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';

interface MathTextProps {
  text: string;
  className?: string;
}

export default function MathText({ text, className = '' }: MathTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Clear previous content
      containerRef.current.innerHTML = '';

      // Check if text contains LaTeX
      const hasLatex = text.includes('\\') || text.includes('$');

      if (hasLatex) {
        // Try to render as display math first
        try {
          katex.render(text, containerRef.current, {
            displayMode: true,
            throwOnError: false,
            trust: true,
          });
        } catch (e) {
          // If that fails, try inline math
          try {
            katex.render(text, containerRef.current, {
              displayMode: false,
              throwOnError: false,
              trust: true,
            });
          } catch (e2) {
            // If both fail, just display as text
            containerRef.current.textContent = text;
          }
        }
      } else {
        // No LaTeX, just display as text
        containerRef.current.textContent = text;
      }
    } catch (error) {
      console.error('Error rendering math:', error);
      if (containerRef.current) {
        containerRef.current.textContent = text;
      }
    }
  }, [text]);

  return <div ref={containerRef} className={className} />;
}
