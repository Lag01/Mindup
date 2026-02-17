'use client';

import { useEffect, useRef, useState } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';

interface LoadingAnimationProps {
  size?: 'small' | 'medium' | 'large';
  message?: string; // Garder pour compatibilité mais ne pas l'utiliser
  fullScreen?: boolean;
}

export default function LoadingAnimation({
  size = 'medium',
  fullScreen = false,
}: LoadingAnimationProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [animationError, setAnimationError] = useState(false);
  const [animationData, setAnimationData] = useState<object | null>(null);

  // Déterminer la taille en pixels
  const getSize = () => {
    switch (size) {
      case 'small':
        return 100;
      case 'large':
        return 300;
      case 'medium':
      default:
        return 200;
    }
  };

  const sizeInPx = getSize();

  // Charger le JSON Lottie dynamiquement au lieu de l'importer statiquement
  useEffect(() => {
    let cancelled = false;
    fetch('/logo-animation.json')
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setAnimationData(data);
      })
      .catch(() => {
        if (!cancelled) setAnimationError(true);
      });
    return () => { cancelled = true; };
  }, []);

  // Configurer la vitesse de l'animation à x2
  useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(2);
    }
  }, [animationData]);

  // Fallback spinner CSS si Lottie échoue ou est en cours de chargement
  const SpinnerFallback = () => (
    <div
      className="animate-spin rounded-full border-b-2 border-blue-500"
      style={{ width: sizeInPx, height: sizeInPx }}
    />
  );

  // Composant Lottie
  const LottieAnimation = () => {
    if (animationError || !animationData) {
      return <SpinnerFallback />;
    }

    return (
      <div style={{ width: sizeInPx, height: sizeInPx }}>
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          loop={true}
          autoplay={true}
          style={{ width: '100%', height: '100%' }}
          onLoadedImages={() => {
            if (lottieRef.current) {
              lottieRef.current.setSpeed(2);
            }
          }}
          onError={() => setAnimationError(true)}
          rendererSettings={{
            preserveAspectRatio: 'xMidYMid slice'
          }}
        />
      </div>
    );
  };

  // Contenu de l'animation (SANS message)
  const AnimationContent = () => (
    <div className="flex flex-col items-center justify-center">
      <LottieAnimation />
    </div>
  );

  // Mode fullScreen
  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <AnimationContent />
      </div>
    );
  }

  // Mode inline
  return <AnimationContent />;
}
