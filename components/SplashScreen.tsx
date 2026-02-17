'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import LoadingAnimation from './LoadingAnimation';

export default function SplashScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const hasSeenSplash = localStorage.getItem('hasSeenSplash');
    if (hasSeenSplash) {
      setShowSplash(false);
    }
  }, []);

  // Callback appelé quand l'animation Lottie est prête : on lance le timer
  const handleAnimationReady = useCallback(() => {
    const hasSeenSplash = localStorage.getItem('hasSeenSplash');
    if (hasSeenSplash) return;

    timerRef.current = setTimeout(() => {
      setFadeOut(true);

      fadeTimerRef.current = setTimeout(() => {
        setShowSplash(false);
        localStorage.setItem('hasSeenSplash', 'true');
      }, 300);
    }, 1500);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
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
      <LoadingAnimation size="large" onReady={handleAnimationReady} />
    </div>
  );
}
