'use client';

interface BaseModalProps {
  isOpen: boolean;
  title: string;
  inputLabel: string;
  inputPlaceholder: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  submitButtonText: string;
  submitButtonLoadingText: string;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isSubmitting: boolean;
  error: string;
  maxLength?: number;
}

export default function BaseModal({
  isOpen,
  title,
  inputLabel,
  inputPlaceholder,
  inputValue,
  onInputChange,
  submitButtonText,
  submitButtonLoadingText,
  onSubmit,
  onClose,
  isSubmitting,
  error,
  maxLength = 100,
}: BaseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-md border border-zinc-800">
        <h2 className="text-xl font-bold text-foreground mb-4">{title}</h2>

        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <label htmlFor="modal-input" className="block text-zinc-300 text-sm mb-2">
              {inputLabel}
            </label>
            <input
              id="modal-input"
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              className="w-full bg-zinc-800 text-foreground border border-zinc-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder={inputPlaceholder}
              autoFocus
              maxLength={maxLength}
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? submitButtonLoadingText : submitButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
