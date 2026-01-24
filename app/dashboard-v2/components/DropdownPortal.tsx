'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface DropdownPortalProps {
  children: ReactNode;
  buttonRef: React.RefObject<HTMLButtonElement>;
  isOpen: boolean;
  onClose: () => void;
  align?: 'right' | 'left';
}

export default function DropdownPortal({
  children,
  buttonRef,
  isOpen,
  onClose,
  align = 'right',
}: DropdownPortalProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left?: number; right?: number }>({ top: 0, left: 0, right: 0 });

  // Calculer la position du dropdown
  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const updatePosition = () => {
      const buttonRect = buttonRef.current!.getBoundingClientRect();
      const dropdownHeight = dropdownRef.current?.offsetHeight || 0;
      const viewportHeight = window.innerHeight;

      // Déterminer si on affiche en haut ou en bas
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      const shouldShowAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      setPosition({
        top: shouldShowAbove
          ? buttonRect.top - dropdownHeight - 8
          : buttonRect.bottom + 8,
        left: align === 'left' ? buttonRect.left : undefined,
        right: align === 'right' ? window.innerWidth - buttonRect.right : undefined,
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, buttonRef, align]);

  // Fermer avec Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, buttonRef]);

  if (!isOpen || typeof window === 'undefined') return null;

  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999]"
      style={{
        top: position.top,
        left: position.left,
        right: position.right,
      }}
    >
      {children}
    </div>,
    document.body
  );
}
