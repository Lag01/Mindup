'use client';

import { useCallback, useEffect, useRef, useState, memo } from 'react';

interface NumPadProps {
  onInput: (digit: string) => void;
  onDelete: () => void;
  userAnswer: string;
}

function NumPad({ onInput, onDelete, userAnswer }: NumPadProps) {
  // Map pour tracker le dernier timestamp de chaque touche (détection de vrais doubles clics)
  const lastInputTimeRef = useRef<Map<string, number>>(new Map());

  // Tracker de la dernière touche pressée pour distinguer même bouton vs boutons différents
  const lastKeyRef = useRef<string | null>(null);

  // État pour le feedback visuel des touches pressées
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  // Seuil de détection de double-clic en millisecondes (même touche uniquement)
  // 50ms pour mobile (vs 10ms pour desktop) pour gérer la latence tactile
  const DOUBLE_CLICK_THRESHOLD = 50;

  const handleButtonPress = useCallback((key: string) => {
    const now = performance.now();
    const lastTime = lastInputTimeRef.current.get(key);
    const isSameKey = lastKeyRef.current === key;

    // Bloquer SEULEMENT si c'est le MÊME bouton en moins de 50ms (rebond physique)
    if (lastTime && isSameKey && (now - lastTime) < DOUBLE_CLICK_THRESHOLD) {
      return;
    }

    // Enregistrer le timestamp pour cette touche et mettre à jour la dernière touche
    lastInputTimeRef.current.set(key, now);
    lastKeyRef.current = key;

    // Feedback visuel
    setPressedKeys(prev => new Set(prev).add(key));
    setTimeout(() => {
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 100);

    // Traiter l'input
    if (key === 'delete') {
      onDelete();
    } else {
      onInput(key);
    }
  }, [onInput, onDelete]);

  // Support du clavier physique (pavé numérique et clavier principal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si focus sur un input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ignorer les répétitions automatiques (touche maintenue)
      if (e.repeat) {
        return;
      }

      // Mapping des touches du pavé numérique et clavier principal
      const keyMap: Record<string, string> = {
        // Pavé numérique
        'Numpad0': '0', 'Numpad1': '1', 'Numpad2': '2', 'Numpad3': '3',
        'Numpad4': '4', 'Numpad5': '5', 'Numpad6': '6', 'Numpad7': '7',
        'Numpad8': '8', 'Numpad9': '9',
        // Clavier principal (pour compatibilité)
        '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
        '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
        // Suppression
        'Backspace': 'delete',
        'Delete': 'delete',
      };

      const mappedKey = keyMap[e.key];

      if (mappedKey) {
        e.preventDefault(); // Empêcher le comportement par défaut
        handleButtonPress(mappedKey);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleButtonPress]);

  // Nettoyage périodique du Map (éviter fuite mémoire)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = performance.now();
      const threshold = 1000; // Nettoyer les entrées de plus d'1 seconde

      lastInputTimeRef.current.forEach((timestamp, key) => {
        if (now - timestamp > threshold) {
          lastInputTimeRef.current.delete(key);
        }
      });
    }, 5000); // Nettoyage toutes les 5 secondes

    return () => clearInterval(interval);
  }, []);

  const layout = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['', '0', 'delete'],
  ];

  return (
    <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
      {layout.flat().map((key, index) => {
        if (key === '') {
          return <div key={index} />;
        }

        const isPressed = pressedKeys.has(key);

        return (
          <button
            key={index}
            onTouchStart={(e) => {
              // Gestion optimisée pour tactile mobile (appelé avant batching)
              e.preventDefault();
              e.stopPropagation();

              // Traiter TOUTES les touches simultanées, pas juste la première
              Array.from(e.touches).forEach((touch) => {
                const element = document.elementFromPoint(touch.clientX, touch.clientY);
                if (element instanceof HTMLButtonElement) {
                  // Récupérer la valeur du bouton touché
                  const buttonText = element.textContent?.trim();

                  // Mapper le texte vers la clé appropriée
                  let touchKey: string | null = null;
                  if (buttonText === '⌫') {
                    touchKey = 'delete';
                  } else if (buttonText && /^\d$/.test(buttonText)) {
                    touchKey = buttonText;
                  }

                  if (touchKey) {
                    handleButtonPress(touchKey);
                  }
                }
              });
            }}
            onPointerDown={(e) => {
              // Fallback pour souris/stylet (ignorer si déjà géré par onTouchStart)
              if (e.pointerType === 'touch') return;
              e.preventDefault();
              handleButtonPress(key);
            }}
            className={`
              h-16 md:h-20 rounded-lg font-bold text-xl md:text-2xl
              select-none
              [-webkit-tap-highlight-color:transparent]
              transition-all duration-50
              active:scale-95
              ${isPressed ? 'scale-95 brightness-110' : 'scale-100'}
              ${
                key === 'delete'
                  ? 'bg-red-800 hover:bg-red-700 active:bg-red-600 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-white'
              }
              ${key === 'delete' && userAnswer === '' ? 'invisible' : ''}
            `}
            disabled={key === 'delete' && userAnswer === ''}
          >
            {key === 'delete' ? '⌫' : key}
          </button>
        );
      })}
    </div>
  );
}

// Mémoriser le composant pour éviter les re-renders inutiles
// Le NumPad ne change que quand userAnswer change
export default memo(NumPad);
