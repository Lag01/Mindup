import { useEffect, useState } from 'react';

/**
 * Hook pour animer un compteur de 0 à une valeur cible
 */
export function useCountAnimation(targetValue: number, duration: number = 600) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Si la valeur cible est 0, pas besoin d'animation
    if (targetValue === 0) {
      setCount(0);
      return;
    }

    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      if (startTime === null) {
        startTime = currentTime;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Fonction d'easing pour une animation plus fluide (ease-out)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      const currentCount = Math.floor(easeOutQuart * targetValue);
      setCount(currentCount);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setCount(targetValue); // S'assurer qu'on arrive exactement à la valeur cible
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [targetValue, duration]);

  return count;
}
