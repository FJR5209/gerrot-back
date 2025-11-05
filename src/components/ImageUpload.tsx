import { useState, useRef, useEffect } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContextObject';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageSelect: (file: File) => void;
  onImageRemove?: () => void;
  label?: string;
  shape?: 'circle' | 'square';
  size?: 'sm' | 'md' | 'lg';
  accept?: string;
  maxSize?: number; // em MB
}

const sizeMap = {
  sm: 'w-20 h-20',
  md: 'w-32 h-32',
  lg: 'w-40 h-40',
};

export function ImageUpload({
  currentImageUrl,
  onImageSelect,
  onImageRemove,
  label = 'Upload de Imagem',
  shape = 'square',
  size = 'md',
  accept = 'image/jpeg,image/png,image/gif,image/webp',
  maxSize = 5, // 5MB por padrão
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { logout } = useAuth();
  const baseURL = (api.defaults?.baseURL as string | undefined) ?? (import.meta.env.VITE_API_URL || '');
  const objectUrlRef = useRef<string | null>(null);

  const validateFile = (file: File): string | null => {
    // Validar tipo
    const acceptedTypes = accept.split(',').map(t => t.trim());
    if (!acceptedTypes.some(type => file.type.match(type.replace('*', '.*')))) {
      return 'Formato de arquivo não suportado. Use JPEG, PNG, GIF ou WebP.';
    }

    // Validar tamanho
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `Arquivo muito grande. Tamanho máximo: ${maxSize}MB`;
    }

    return null;
  };

  const handleFile = (file: File) => {
    setError(null);
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Criar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Notificar parent
    onImageSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onImageRemove?.();
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    let cancelled = false;

    const revoke = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };

    async function resolveCurrent() {
      if (preview) return; // quando há preview local, ignorar remoto
      revoke();
      if (!currentImageUrl) return;
      try {
        if (currentImageUrl.startsWith('/users/')) {
          const res = await api.get(currentImageUrl, { responseType: 'blob' });
          if (cancelled) return;
          const url = URL.createObjectURL(res.data);
          objectUrlRef.current = url;
          setPreview(url); // reutilizamos preview como src resolvido
        } else if (currentImageUrl.startsWith('/uploads/')) {
          setPreview(`${baseURL}${currentImageUrl}`);
        } else if (/^https?:\/\//i.test(currentImageUrl)) {
          setPreview(currentImageUrl);
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) logout();
      }
    }

    resolveCurrent();
    return () => {
      cancelled = true;
      revoke();
    };
  }, [currentImageUrl, baseURL, preview, logout]);

  const displayImage = preview || null;
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div className="flex items-start gap-4">
        {/* Preview ou Placeholder */}
        <div className={`${sizeMap[size]} ${shapeClass} overflow-hidden border-2 border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0`}>
          {displayImage ? (
            <img
              src={displayImage}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon className="w-8 h-8 text-gray-400" />
          )}
        </div>

        {/* Upload Area */}
        <div className="flex-1">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            className={`border-2 border-dashed rounded-lg p-4 transition cursor-pointer ${
              isDragging
                ? 'border-purple-500 bg-purple-50'
                : error
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 hover:border-purple-400 bg-white'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="text-center">
              <Upload className={`mx-auto h-8 w-8 mb-2 ${isDragging ? 'text-purple-600' : 'text-gray-400'}`} />
              <p className="text-sm text-gray-600">
                <span className="font-medium text-purple-600">Clique para fazer upload</span>
                {' '}ou arraste e solte
              </p>
              <p className="text-xs text-gray-500 mt-1">
                JPEG, PNG, GIF ou WebP (max. {maxSize}MB)
              </p>
            </div>
          </div>

          {/* Botão Remover */}
          {(displayImage) && (
            <button
              type="button"
              onClick={handleRemove}
              className="mt-2 inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              <X className="w-4 h-4" />
              Remover imagem
            </button>
          )}

          {/* Mensagem de Erro */}
          {error && (
            <p className="mt-2 text-sm text-red-600 flex items-start gap-1">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
