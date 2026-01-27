'use client';

interface DashboardChoiceModalProps {
  isOpen: boolean;
  onChoose: (version: 'v1' | 'v2') => Promise<void>;
  onClose: () => void;
}

export default function DashboardChoiceModal({
  isOpen,
  onChoose,
  onClose,
}: DashboardChoiceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-md border border-zinc-800">
        <h2 className="text-xl font-bold text-foreground mb-2">
          Nouvelle version du dashboard disponible !
        </h2>
        <p className="text-zinc-400 text-sm mb-6">
          Nous avons redessiné le tableau de bord avec une interface moderne. Vous pouvez essayer la nouvelle version ou rester sur l'ancienne.
        </p>

        <div className="space-y-4 mb-6">
          {/* Version 2 - Nouvelle */}
          <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
            <h3 className="font-semibold text-foreground mb-2">Nouvelle version</h3>
            <ul className="text-sm text-zinc-300 space-y-1">
              <li>• Interface moderne et épurée</li>
              <li>• Statistiques visuelles améliorées</li>
              <li>• Meilleure organisation des informations</li>
            </ul>
          </div>

          {/* Version 1 - Ancienne */}
          <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
            <h3 className="font-semibold text-foreground mb-2">Version classique</h3>
            <ul className="text-sm text-zinc-300 space-y-1">
              <li>• Interface familière</li>
              <li>• Fonctionnalités éprouvées</li>
              <li>• Simplicité et rapidité</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => onChoose('v2')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-3 rounded-lg transition-colors"
          >
            Essayer la nouvelle version
          </button>
          <button
            onClick={() => onChoose('v1')}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-3 rounded-lg transition-colors"
          >
            Rester sur la version classique
          </button>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-400 text-sm py-2 transition-colors"
          >
            Je choisirai plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
