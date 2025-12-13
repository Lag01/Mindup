'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import NumPad from './NumPad';

type MathMode = 'ADDITION' | 'SUBTRACTION' | 'MULTIPLICATION' | 'DIVISION';

interface Operation {
  num1: number;
  num2: number;
  operator: string;
  answer: number;
}

interface GameScreenProps {
  mode: MathMode;
  onGameEnd: (score: number) => void;
}

// Générer une opération aléatoire
function generateOperation(mode: MathMode): Operation {
  let num1: number, num2: number, operator: string, answer: number;

  switch (mode) {
    case 'ADDITION':
      num1 = Math.floor(Math.random() * 50) + 1;
      num2 = Math.floor(Math.random() * 50) + 1;
      operator = '+';
      answer = num1 + num2;
      break;

    case 'SUBTRACTION':
      num1 = Math.floor(Math.random() * 50) + 1;
      num2 = Math.floor(Math.random() * num1) + 1;
      operator = '-';
      answer = num1 - num2;
      break;

    case 'MULTIPLICATION':
      num1 = Math.floor(Math.random() * 10) + 1;
      num2 = Math.floor(Math.random() * 10) + 1;
      operator = '×';
      answer = num1 * num2;
      break;

    case 'DIVISION':
      const quotient = Math.floor(Math.random() * 10) + 1;
      num2 = Math.floor(Math.random() * 10) + 1;
      num1 = quotient * num2;
      operator = '÷';
      answer = quotient;
      break;

    default:
      throw new Error('Mode invalide');
  }

  return { num1, num2, operator, answer };
}

export default function GameScreen({ mode, onGameEnd }: GameScreenProps) {
  const [currentOp, setCurrentOp] = useState<Operation>(generateOperation(mode));
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0); // Ref pour éviter les problèmes de closure
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isPlaying, setIsPlaying] = useState(true);
  const [finalScore, setFinalScore] = useState(0);

  // Handlers mémorisés pour le pavé numérique
  const handleInput = useCallback((digit: string) => {
    setUserAnswer(prev => prev + digit);
  }, []);

  const handleDelete = useCallback(() => {
    setUserAnswer(prev => prev.slice(0, -1));
  }, []);

  // Timer
  useEffect(() => {
    if (!isPlaying) return;

    const startTime = Date.now();
    const endTime = startTime + 60000;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));

      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        setIsPlaying(false);
        setFinalScore(scoreRef.current); // Utiliser le ref pour éviter la closure périmée
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Sauvegarder le score à la fin
  useEffect(() => {
    if (!isPlaying && finalScore >= 0) {
      // Sauvegarder uniquement si le score est > 0
      if (finalScore > 0) {
        fetch('/api/veryfastmath/save-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, score: finalScore }),
        })
          .then(() => onGameEnd(finalScore))
          .catch(err => {
            console.error('Erreur sauvegarde:', err);
            onGameEnd(finalScore);
          });
      } else {
        // Si score = 0, passer directement à l'écran de résultats sans sauvegarder
        onGameEnd(finalScore);
      }
    }
  }, [isPlaying, finalScore, mode, onGameEnd]);

  // Vérification de la réponse
  useEffect(() => {
    if (!userAnswer || !isPlaying) return;

    const numAnswer = parseFloat(userAnswer);
    if (numAnswer === currentOp.answer) {
      setScore(s => {
        const newScore = s + 1;
        scoreRef.current = newScore; // Synchroniser le ref avec le score
        return newScore;
      });
      setUserAnswer('');
      setCurrentOp(generateOperation(mode));
    }
  }, [userAnswer, currentOp, isPlaying, mode]);

  if (!isPlaying) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-2xl">Chargement des résultats...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Opération - flex-grow pour occuper l'espace disponible */}
      <div className="flex-grow flex items-center justify-center">
        <div className="text-4xl md:text-6xl font-bold">
          {currentOp.num1} {currentOp.operator} {currentOp.num2} = ?
        </div>
      </div>

      {/* Timer et score */}
      <div className="py-4 flex justify-around text-xl md:text-2xl">
        <div className={timeRemaining <= 10 ? 'text-red-500 font-bold' : ''}>
          Temps : {timeRemaining}s
        </div>
        <div>Score : {score}</div>
      </div>

      {/* Réponse en cours */}
      <div className="py-6 text-center">
        <div className="text-3xl min-h-[60px] bg-zinc-800 rounded-lg p-4 max-w-sm mx-auto flex items-center justify-center">
          {userAnswer || <span className="text-zinc-600">...</span>}
        </div>
      </div>

      {/* Pavé numérique - ancré en bas */}
      <div className="pb-16">
        <NumPad
          onInput={handleInput}
          onDelete={handleDelete}
          userAnswer={userAnswer}
        />
      </div>
    </div>
  );
}
