'use client';

import { useEffect, useRef, useState } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import logoAnimation from '@/public/logo-animation.json';

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

  // Configurer la vitesse de l'animation à x2
  useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(2);
    }
  }, []);

  // Composant Lottie
  const LottieAnimation = () => {
    if (animationError) {
      return <SpinnerFallback />;
    }

    return (
      <div style={{ width: sizeInPx, height: sizeInPx }}>
        <Lottie
          lottieRef={lottieRef}
          animationData={logoAnimation}
          loop={true}
          autoplay={true}
          style={{ width: '100%', height: '100%' }}
          onLoadedImages={() => {
            // Animation chargée avec succès
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

  // Fallback spinner CSS si Lottie échoue
  const SpinnerFallback = () => (
    <div
      className="animate-spin rounded-full border-b-2 border-blue-500"
      style={{ width: sizeInPx, height: sizeInPx }}
    />
  );

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
