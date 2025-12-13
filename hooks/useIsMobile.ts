import { useEffect, useState } from 'react';

/**
 * Hook pour détecter si l'appareil est en mode mobile
 * Utilise la largeur de l'écran (< 768px = mobile)
 *
 * @returns {boolean} true si l'écran est en mode mobile (< 768px)
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Vérifier au montage du composant
    checkMobile();

    // Ajouter un listener pour les changements de taille d'écran
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}
