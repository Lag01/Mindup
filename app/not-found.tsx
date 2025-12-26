'use client';

import { useRouter } from 'next/navigation';
import LoadingAnimation from '@/components/LoadingAnimation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8 flex justify-center">
          <LoadingAnimation size="large" />
        </div>

        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>

        <h2 className="text-2xl font-semibold text-foreground mb-4">
          Page non trouvée
        </h2>

        <p className="text-zinc-400 mb-8">
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
        </p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Retour au dashboard
          </button>

          <button
            onClick={() => router.back()}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Page précédente
          </button>
        </div>
      </div>
    </div>
  );
}
