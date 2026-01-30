'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/useIsMobile';

interface LogoProps {
  variant?: 'full' | 'icon' | 'medium' | 'small' | 'text';
  size?: number;
  className?: string;
  onClick?: () => void;
  priority?: boolean;
  disableResponsive?: boolean;
}

export default function Logo({
  variant = 'full',
  size,
  className = '',
  onClick,
  priority = false,
  disableResponsive = false,
}: LogoProps) {
  const router = useRouter();
  const isMobile = useIsMobile();

  // Adapter automatiquement pour mobile si variant='full' ET si responsive activé
  const effectiveVariant = !disableResponsive && variant === 'full' && isMobile ? 'icon' : variant;

  // Déterminer le chemin de l'image selon le variant
  const getImagePath = () => {
    switch (effectiveVariant) {
      case 'icon':
        return '/logo-icon.png';
      case 'medium':
        return '/logo-medium.png';
      case 'small':
        return '/logo-small.png';
      case 'text':
        return '/logo-text.png';
      case 'full':
      default:
        return '/logo-full.png';
    }
  };

  // Déterminer la taille par défaut selon le variant
  const getDefaultSize = () => {
    if (size) return size;

    switch (effectiveVariant) {
      case 'icon':
        return 48;
      case 'small':
        return 120;
      case 'medium':
        return 150;
      case 'text':
        return 180;
      case 'full':
      default:
        return 200;
    }
  };

  const finalSize = getDefaultSize();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Par défaut, rediriger vers le dashboard
      router.push('/dashboard-entry');
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer transition-transform hover:scale-105 ${className}`}
      style={{ width: finalSize, height: finalSize }}
    >
      <Image
        src={getImagePath()}
        alt="Logo MindUp"
        width={finalSize}
        height={finalSize}
        priority={priority}
        className="object-contain"
      />
    </div>
  );
}
