import MathText from '@/components/MathText';
import ImageUploader from '@/components/ImageUploader';
import { CardFormData, FieldsVisibility } from '@/lib/types';

interface CardEditorProps {
  formData: CardFormData;
  frontVisibility: FieldsVisibility;
  backVisibility: FieldsVisibility;
  isAdmin: boolean;
  saving: boolean;
  onFormChange: (data: Partial<CardFormData>) => void;
  onFrontVisibilityChange: (visibility: Partial<FieldsVisibility>) => void;
  onBackVisibilityChange: (visibility: Partial<FieldsVisibility>) => void;
  onSwap: () => void;
  onCancel: () => void;
  onSave: () => void;
}

/**
 * Formulaire d'édition de carte avec toggles pour texte/LaTeX/image
 */
export function CardEditor({
  formData,
  frontVisibility,
  backVisibility,
  isAdmin,
  saving,
  onFormChange,
  onFrontVisibilityChange,
  onBackVisibilityChange,
  onSwap,
  onCancel,
  onSave,
}: CardEditorProps) {
  // Handlers pour les toggles FRONT
  const handleToggleFrontText = () => {
    const activeFieldsCount = [
      frontVisibility.showText || frontVisibility.showLatex,
      frontVisibility.showImage
    ].filter(Boolean).length;

    if (frontVisibility.showText && activeFieldsCount <= 1) {
      alert('⚠️ Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }

    onFrontVisibilityChange({
      showText: !frontVisibility.showText,
      showLatex: frontVisibility.showText ? frontVisibility.showLatex : false,
    });

    if (!frontVisibility.showText) {
      onFormChange({ frontType: 'TEXT' });
    }
  };

  const handleToggleFrontLatex = () => {
    const activeFieldsCount = [
      frontVisibility.showText || frontVisibility.showLatex,
      frontVisibility.showImage
    ].filter(Boolean).length;

    if (frontVisibility.showLatex && activeFieldsCount <= 1) {
      alert('⚠️ Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }

    onFrontVisibilityChange({
      showLatex: !frontVisibility.showLatex,
      showText: frontVisibility.showLatex ? frontVisibility.showText : false,
    });

    if (!frontVisibility.showLatex) {
      onFormChange({ frontType: 'LATEX' });
    }
  };

  const handleToggleFrontImage = async () => {
    const activeFieldsCount = [
      frontVisibility.showText || frontVisibility.showLatex,
      frontVisibility.showImage
    ].filter(Boolean).length;

    if (frontVisibility.showImage && activeFieldsCount <= 1) {
      alert('⚠️ Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }

    // Si on désactive une image existante, la supprimer
    if (frontVisibility.showImage && formData.frontImage) {
      try {
        await fetch('/api/upload/delete-card-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePath: formData.frontImage }),
        });
        onFormChange({ frontImage: null });
      } catch (error) {
        console.error('Erreur suppression image:', error);
      }
    }

    onFrontVisibilityChange({ showImage: !frontVisibility.showImage });
  };

  // Handlers pour les toggles BACK
  const handleToggleBackText = () => {
    const activeFieldsCount = [
      backVisibility.showText || backVisibility.showLatex,
      backVisibility.showImage
    ].filter(Boolean).length;

    if (backVisibility.showText && activeFieldsCount <= 1) {
      alert('⚠️ Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }

    onBackVisibilityChange({
      showText: !backVisibility.showText,
      showLatex: backVisibility.showText ? backVisibility.showLatex : false,
    });

    if (!backVisibility.showText) {
      onFormChange({ backType: 'TEXT' });
    }
  };

  const handleToggleBackLatex = () => {
    const activeFieldsCount = [
      backVisibility.showText || backVisibility.showLatex,
      backVisibility.showImage
    ].filter(Boolean).length;

    if (backVisibility.showLatex && activeFieldsCount <= 1) {
      alert('⚠️ Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }

    onBackVisibilityChange({
      showLatex: !backVisibility.showLatex,
      showText: backVisibility.showLatex ? backVisibility.showText : false,
    });

    if (!backVisibility.showLatex) {
      onFormChange({ backType: 'LATEX' });
    }
  };

  const handleToggleBackImage = async () => {
    const activeFieldsCount = [
      backVisibility.showText || backVisibility.showLatex,
      backVisibility.showImage
    ].filter(Boolean).length;

    if (backVisibility.showImage && activeFieldsCount <= 1) {
      alert('⚠️ Au moins un champ doit être actif (Texte, LaTeX ou Image)');
      return;
    }

    // Si on désactive une image existante, la supprimer
    if (backVisibility.showImage && formData.backImage) {
      try {
        await fetch('/api/upload/delete-card-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePath: formData.backImage }),
        });
        onFormChange({ backImage: null });
      } catch (error) {
        console.error('Erreur suppression image:', error);
      }
    }

    onBackVisibilityChange({ showImage: !backVisibility.showImage });
  };

  return (
    <div className="space-y-3" data-card-form>
      {/* Front */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-zinc-300 font-medium text-sm">Recto</label>
          <div className="flex gap-2">
            <button
              onClick={handleToggleFrontText}
              className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                frontVisibility.showText
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Texte
            </button>
            <button
              onClick={handleToggleFrontLatex}
              className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                frontVisibility.showLatex
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              LaTeX
            </button>
            {isAdmin && (
              <button
                onClick={handleToggleFrontImage}
                className={`px-2.5 py-0.5 rounded text-xs transition-colors flex items-center gap-1 ${
                  frontVisibility.showImage
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Image
              </button>
            )}
          </div>
        </div>

        {/* Textarea - Affichage conditionnel */}
        {(frontVisibility.showText || frontVisibility.showLatex) && (
          <textarea
            value={formData.front}
            onChange={e => onFormChange({ front: e.target.value })}
            placeholder={frontVisibility.showLatex ? "Entrez du LaTeX..." : "Entrez le recto..."}
            className="w-full bg-zinc-800 text-foreground border border-zinc-700 rounded-lg p-3 min-h-[80px] sm:min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        )}

        {/* Aperçu LaTeX */}
        {formData.front && frontVisibility.showLatex && (
          <div className="mt-1.5 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
            <div className="text-zinc-400 text-xs mb-1">Aperçu LaTeX :</div>
            <MathText
              text={formData.front}
              contentType="LATEX"
              autoResize={false}
              className="text-foreground"
            />
          </div>
        )}

        {/* Upload image recto - Affichage conditionnel */}
        {isAdmin && frontVisibility.showImage && (
          <div className="mt-2">
            <ImageUploader
              currentImage={formData.frontImage}
              onImageUploaded={(path) => onFormChange({ frontImage: path })}
              onImageRemoved={() => onFormChange({ frontImage: null })}
              label="Recto"
            />
          </div>
        )}
      </div>

      {/* Bouton d'inversion */}
      <div className="flex justify-center -my-2">
        <button
          type="button"
          onClick={onSwap}
          disabled={saving}
          className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 p-2 rounded-lg transition-colors disabled:opacity-50 group"
          title="Inverser le recto et le verso"
        >
          <svg className="w-5 h-5 transform group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* Back */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-zinc-300 font-medium text-sm">Verso</label>
          <div className="flex gap-2">
            <button
              onClick={handleToggleBackText}
              className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                backVisibility.showText
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Texte
            </button>
            <button
              onClick={handleToggleBackLatex}
              className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                backVisibility.showLatex
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              LaTeX
            </button>
            {isAdmin && (
              <button
                onClick={handleToggleBackImage}
                className={`px-2.5 py-0.5 rounded text-xs transition-colors flex items-center gap-1 ${
                  backVisibility.showImage
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Image
              </button>
            )}
          </div>
        </div>

        {/* Textarea - Affichage conditionnel */}
        {(backVisibility.showText || backVisibility.showLatex) && (
          <textarea
            value={formData.back}
            onChange={e => onFormChange({ back: e.target.value })}
            placeholder={backVisibility.showLatex ? "Entrez du LaTeX..." : "Entrez le verso..."}
            className="w-full bg-zinc-800 text-foreground border border-zinc-700 rounded-lg p-3 min-h-[80px] sm:min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        )}

        {/* Aperçu LaTeX */}
        {formData.back && backVisibility.showLatex && (
          <div className="mt-1.5 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
            <div className="text-zinc-400 text-xs mb-1">Aperçu LaTeX :</div>
            <MathText
              text={formData.back}
              contentType="LATEX"
              autoResize={false}
              className="text-foreground"
            />
          </div>
        )}

        {/* Upload image verso - Affichage conditionnel */}
        {isAdmin && backVisibility.showImage && (
          <div className="mt-2">
            <ImageUploader
              currentImage={formData.backImage}
              onImageUploaded={(path) => onFormChange({ backImage: path })}
              onImageRemoved={() => onFormChange({ backImage: null })}
              label="Verso"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={onCancel}
            disabled={saving}
            className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm order-2 sm:order-1"
          >
            Annuler
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm order-1 sm:order-2"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
