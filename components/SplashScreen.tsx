'use client';

import { useEffect, useRef, useState } from 'react';
import LoadingAnimation from './LoadingAnimation';

export default function SplashScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà vu le splash screen
    const hasSeenSplash = localStorage.getItem('hasSeenSplash');

    if (hasSeenSplash) {
      setShowSplash(false);
      return;
    }

    // Attendre 1.5 secondes puis commencer le fade-out
    const timer = setTimeout(() => {
      setFadeOut(true);

      // Après l'animation de fade-out (300ms), masquer complètement
      fadeTimerRef.current = setTimeout(() => {
        setShowSplash(false);
        localStorage.setItem('hasSeenSplash', 'true');
      }, 300);
    }, 1500);

    return () => {
      clearTimeout(timer);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  if (!showSplash) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 bg-zinc-900 flex items-center justify-center ${
        fadeOut ? 'animate-fade-out' : ''
      }`}
    >
      <LoadingAnimation size="large" />
    </div>
  );
}
