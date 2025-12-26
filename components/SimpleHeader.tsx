'use client';

import Logo from './Logo';
import { useRouter } from 'next/navigation';

interface SimpleHeaderProps {
  title: string;
  showLogo?: boolean;
  backButton?: {
    label: string;
    href: string;
  };
}

export default function SimpleHeader({
  title,
  showLogo = true,
  backButton,
}: SimpleHeaderProps) {
  const router = useRouter();

  return (
    <header className="bg-zinc-900 border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo + Titre */}
        <div className="flex items-center gap-4">
          {showLogo && (
            <Logo
              variant="icon"
              size={48}
              onClick={() => router.push('/dashboard')}
            />
          )}
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        </div>

        {/* Bouton retour optionnel */}
        {backButton && (
          <button
            onClick={() => router.push(backButton.href)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
          >
            {backButton.label}
          </button>
        )}
      </div>
    </header>
  );
}
