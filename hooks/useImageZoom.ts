import { useState, useCallback, useRef, useMemo } from 'react';

// Constantes de zoom
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.3;

interface Position {
  x: number;
  y: number;
}

interface UseImageZoomReturn {
  scale: number;
  position: Position;
  isDragging: boolean;

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

  // Fonction pour clamper le scale entre min et max
  const clampScale = useCallback((value: number) => {
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));
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
    if (scale <= 1) return; // Pas de drag si pas de zoom

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

    setPosition({
      x: lastPosition.current.x + deltaX,
      y: lastPosition.current.y + deltaY,
    });
  }, [isDragging]);

  // Fin du drag (souris)
  const onMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartPos.current = null;
  }, []);

  // Début du touch (pinch-to-zoom)
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch avec 2 doigts
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      initialPinchDistance.current = distance;
      initialPinchScale.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      // Drag avec 1 doigt (si zoomé)
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
      e.preventDefault();
      const touch = e.touches[0];

      const deltaX = touch.clientX - dragStartPos.current.x;
      const deltaY = touch.clientY - dragStartPos.current.y;

      setPosition({
        x: lastPosition.current.x + deltaX,
        y: lastPosition.current.y + deltaY,
      });
    }
  }, [isDragging, clampScale]);

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
