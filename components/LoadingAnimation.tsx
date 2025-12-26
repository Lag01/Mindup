'use client';

import { useEffect, useRef, useState } from 'react';

interface LoadingAnimationProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingAnimation({
  size = 'medium',
  message,
  fullScreen = false,
}: LoadingAnimationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);

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

  // Configurer la vitesse de la vidéo à x2
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 2.0;
    }
  }, []);

  // Composant vidéo d'animation
  const VideoAnimation = () => (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      onError={() => setVideoError(true)}
      className="object-contain"
      style={{ width: sizeInPx, height: sizeInPx }}
    >
      <source src="/logo-animation.mp4" type="video/mp4" />
    </video>
  );

  // Fallback spinner CSS si la vidéo ne charge pas
  const SpinnerFallback = () => (
    <div
      className="animate-spin rounded-full border-b-2 border-blue-500"
      style={{ width: sizeInPx, height: sizeInPx }}
    />
  );

  // Contenu de l'animation
  const AnimationContent = () => (
    <div className="flex flex-col items-center justify-center gap-4">
      {videoError ? <SpinnerFallback /> : <VideoAnimation />}
      {message && (
        <p className="text-foreground text-lg font-medium animate-pulse">
          {message}
        </p>
      )}
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
