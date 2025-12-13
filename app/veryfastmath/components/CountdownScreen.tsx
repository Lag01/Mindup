'use client';

import { useEffect, useState } from 'react';

interface CountdownScreenProps {
  onCountdownEnd: () => void;
}

export default function CountdownScreen({ onCountdownEnd }: CountdownScreenProps) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count > 0) {
      const timeout = setTimeout(() => {
        setCount(count - 1);
      }, 1000);
      return () => clearTimeout(timeout);
    } else {
      // count === 0 : afficher "GO!" puis démarrer
      const timeout = setTimeout(() => {
        onCountdownEnd();
      }, 500); // Afficher GO! pendant 500ms
      return () => clearTimeout(timeout);
    }
  }, [count, onCountdownEnd]);

  return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="text-9xl font-bold text-blue-500 animate-pulse">
        {count > 0 ? count : 'GO !'}
      </div>
    </div>
  );
}
