import { useState, useCallback, useRef, useMemo, useEffect } from 'react';

// Constantes de zoom
const MIN_SCALE = 0.5;  // Permet de dézoomer si besoin
const MAX_SCALE = 5;    // Permet plus de zoom pour les détails
const ZOOM_STEP = 0.3;

interface Position {
  x: number;
  y: number;
}

interface UseImageZoomReturn {
  scale: number;
  position: Position;
  isDragging: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;

  // Handlers d'événements
  onWheel: (e: React.WheelEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;

  // Actions
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  // Style CSS pour l'image
  imageStyle: React.CSSProperties;
}

export function useImageZoom(): UseImageZoomReturn {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Références pour le drag
  const dragStartPos = useRef<Position | null>(null);
  const lastPosition = useRef<Position>({ x: 0, y: 0 });

  // Références pour le pinch
  const initialPinchDistance = useRef<number | null>(null);
  const initialPinchScale = useRef<number>(1);

  // Référence au conteneur pour calculer les limites
  const containerRef = useRef<HTMLDivElement>(null);

  // Fonction pour clamper le scale entre min et max
  const clampScale = useCallback((value: number) => {
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));
  }, []);

  // Fonction pour limiter la position et empêcher l'image de sortir
  const clampPosition = useCallback((pos: Position, imageScale: number, containerWidth: number, containerHeight: number) => {
    // Si l'image est dézoomée, la forcer au centre
    if (imageScale < 1) {
      return { x: 0, y: 0 };
    }

    // Calcule la taille de l'image zoomée
    const scaledWidth = containerWidth * imageScale;
    const scaledHeight = containerHeight * imageScale;

    // Limites pour empêcher l'image de sortir complètement
    const maxX = (scaledWidth - containerWidth) / 2 + containerWidth * 0.3;
    const maxY = (scaledHeight - containerHeight) / 2 + containerHeight * 0.3;
    const minX = -maxX;
    const minY = -maxY;

    return {
      x: Math.max(minX, Math.min(maxX, pos.x)),
      y: Math.max(minY, Math.min(maxY, pos.y))
    };
  }, []);

  // Zoom avec la molette de la souris
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setScale(prev => clampScale(prev + delta));
  }, [clampScale]);

  // Début du drag (souris)
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale < 1) return; // Pas de drag si l'image est dézoomée

    e.preventDefault();
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    lastPosition.current = position;
  }, [scale, position]);

  // Mouvement du drag (souris)
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStartPos.current) return;

    const deltaX = e.clientX - dragStartPos.current.x;
    const deltaY = e.clientY - dragStartPos.current.y;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newPos = {
        x: lastPosition.current.x + deltaX,
        y: lastPosition.current.y + deltaY,
      };
      setPosition(clampPosition(newPos, scale, rect.width, rect.height));
    } else {
      setPosition({
        x: lastPosition.current.x + deltaX,
        y: lastPosition.current.y + deltaY,
      });
    }
  }, [isDragging, scale, clampPosition]);

  // Fin du drag (souris)
  const onMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartPos.current = null;
  }, []);

  // Début du touch (pinch-to-zoom)
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch avec 2 doigts
      // Ne pas preventDefault ici, on le fera dans onTouchMove
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      initialPinchDistance.current = distance;
      initialPinchScale.current = scale;
    } else if (e.touches.length === 1 && scale >= 1) {
      // Drag avec 1 doigt (si zoomé ou à 100%)
      const touch = e.touches[0];
      dragStartPos.current = { x: touch.clientX, y: touch.clientY };
      lastPosition.current = position;
      setIsDragging(true);
    }
  }, [scale, position]);

  // Mouvement du touch (pinch-to-zoom ou drag)
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance.current !== null) {
      // Pinch en cours
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      const scaleRatio = currentDistance / initialPinchDistance.current;
      const newScale = initialPinchScale.current * scaleRatio;

      setScale(clampScale(newScale));
    } else if (e.touches.length === 1 && isDragging && dragStartPos.current) {
      // Drag en cours
      if (scale > 1) {
        e.preventDefault();
      }
      const touch = e.touches[0];

      const deltaX = touch.clientX - dragStartPos.current.x;
      const deltaY = touch.clientY - dragStartPos.current.y;

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newPos = {
          x: lastPosition.current.x + deltaX,
          y: lastPosition.current.y + deltaY,
        };
        setPosition(clampPosition(newPos, scale, rect.width, rect.height));
      } else {
        setPosition({
          x: lastPosition.current.x + deltaX,
          y: lastPosition.current.y + deltaY,
        });
      }
    }
  }, [isDragging, clampScale, scale, clampPosition]);

  // Fin du touch
  const onTouchEnd = useCallback(() => {
    initialPinchDistance.current = null;
    dragStartPos.current = null;
    setIsDragging(false);
  }, []);

  // Zoom in (bouton +)
  const zoomIn = useCallback(() => {
    setScale(prev => clampScale(prev + ZOOM_STEP));
  }, [clampScale]);

  // Zoom out (bouton -)
  const zoomOut = useCallback(() => {
    setScale(prev => clampScale(prev - ZOOM_STEP));
  }, [clampScale]);

  // Reset du zoom
  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
    dragStartPos.current = null;
    initialPinchDistance.current = null;
  }, []);

  // Réinitialiser la position si on dézoome en dessous de 1
  useEffect(() => {
    if (scale < 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

  // Style CSS pour l'image
  const imageStyle = useMemo<React.CSSProperties>(() => ({
    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
    transformOrigin: 'center center',
    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
  }), [position, scale, isDragging]);

  return {
    scale,
    position,
    isDragging,
    containerRef,

    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd,

    zoomIn,
    zoomOut,
    resetZoom,

    imageStyle,
  };
}
