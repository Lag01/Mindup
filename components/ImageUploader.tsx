'use client';

import { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { addCacheBusting } from '@/lib/image-service';

interface ImageUploaderProps {
  currentImage: string | null;
  onImageUploaded: (path: string) => void;
  onImageRemoved: () => void;
  label: string;
}

export default function ImageUploader({
  currentImage,
  onImageUploaded,
  onImageRemoved,
  label,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation côté client
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Type de fichier non supporté. Formats acceptés : PNG, JPG, GIF, WEBP');
      return;
    }

    // Validation de la taille (avant compression)
    const maxSize = 10 * 1024 * 1024; // 10MB avant compression
    if (file.size > maxSize) {
      setError('Fichier trop volumineux (maximum 10MB avant compression)');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Compression légère côté client
      const options = {
        maxSizeMB: 3, // Taille max après compression client : 3MB
        maxWidthOrHeight: 1920, // Résolution max
        useWebWorker: true,
        fileType: file.type,
      };

      const compressedFile = await imageCompression(file, options);

      const formData = new FormData();
      formData.append('image', compressedFile);

      const response = await fetch('/api/upload/card-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de l\'upload');
      }

      const data = await response.json();
      onImageUploaded(data.path);
    } catch (err) {
      console.error('Erreur upload:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      // Réinitialiser l'input pour permettre de sélectionner le même fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onImageRemoved();
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-zinc-300 font-medium text-sm block">
        Image {label}
      </label>

      {currentImage ? (
        <div className="relative">
          <img
            src={addCacheBusting(currentImage) || currentImage}
            alt={`Aperçu ${label}`}
            className="w-full h-48 object-contain bg-zinc-800 rounded-lg border border-zinc-700"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
            title="Supprimer l'image"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id={`image-upload-${label}`}
          />
          <label
            htmlFor={`image-upload-${label}`}
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              uploading
                ? 'border-zinc-600 bg-zinc-800 cursor-not-allowed'
                : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-600'
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-sm text-zinc-400">Upload en cours...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <svg className="w-10 h-10 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-2 text-sm text-zinc-400">Cliquer pour sélectionner une image</p>
                <p className="text-xs text-zinc-500 mt-1">PNG, JPG, GIF, WEBP (max 10MB, compressé automatiquement)</p>
              </div>
            )}
          </label>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
}
