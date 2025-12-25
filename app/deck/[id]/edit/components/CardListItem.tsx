import CardContentDisplay from '@/components/CardContentDisplay';
import { Card } from '@/lib/types';

interface CardListItemProps {
  card: Card;
  index: number;
  isDuplicate: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Composant pour afficher une carte en mode lecture
 * avec ses actions (éditer/supprimer)
 */
export function CardListItem({
  card,
  index,
  isDuplicate,
  deleting,
  onEdit,
  onDelete,
}: CardListItemProps) {
  return (
    <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
      <div className="flex justify-between items-start mb-4 gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">
            Carte {index + 1}
          </h3>
          {isDuplicate && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-900/30 text-amber-300 border border-amber-700/50">
              ⚠️ Doublon
            </span>
          )}
        </div>
        <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={onEdit}
            className="bg-cyan-500 hover:bg-cyan-400 text-white font-medium px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow-sm shadow-cyan-500/20 transition-all duration-200 ease-out text-xs sm:text-sm whitespace-nowrap"
          >
            Modifier
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="bg-red-900/30 hover:bg-red-900/50 text-red-400 font-medium px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm disabled:opacity-50 whitespace-nowrap"
          >
            {deleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>

      {/* View mode */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="text-zinc-400 text-sm">Recto</div>
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
              {card.frontType === 'LATEX' ? 'LaTeX' : 'Texte'}
            </span>
            {card.frontImage && (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-800/50">
                + Image
              </span>
            )}
          </div>
          <div className="p-4 bg-zinc-800 rounded-lg">
            <CardContentDisplay
              text={card.front}
              textType={card.frontType}
              imagePath={card.frontImage}
              autoResize={false}
              className="text-foreground"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="text-zinc-400 text-sm">Verso</div>
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
              {card.backType === 'LATEX' ? 'LaTeX' : 'Texte'}
            </span>
            {card.backImage && (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-800/50">
                + Image
              </span>
            )}
          </div>
          <div className="p-4 bg-zinc-800 rounded-lg">
            <CardContentDisplay
              text={card.back}
              textType={card.backType}
              imagePath={card.backImage}
              autoResize={false}
              className="text-foreground"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
