'use client';

import { useCallback, useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onError: (message: string) => void;
}

export function FileUpload({ onFileSelect, selectedFile, onError }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [onFileSelect, onError]
  );

  const handleFile = (file: File) => {
    const validation = api.validateFile(file);
    if (!validation.valid) {
      onError(validation.error || 'Invalid file');
      return;
    }
    onFileSelect(file);
  };

  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,.txt,.html,.htm';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    };
    input.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      tabIndex={0}
      role="button"
      aria-label="Upload markdown or HTML file - click or drag and drop"
      className={cn(
        'h-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200 flex flex-col justify-center min-h-[280px]',
        isDragging
          ? 'border-[#00A99D] bg-[#fbf7f1]'
          : 'border-gray-300 hover:border-[#00A99D]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D] focus-visible:ring-offset-2'
      )}
    >
      <Upload className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />

      <p className="mt-4 text-base font-medium text-gray-900">
        Drop your file here
      </p>
      <p className="mt-1 text-sm text-gray-500">or click to browse</p>
      <p className="mt-2 text-xs text-gray-400">
        .md, .markdown, .txt, .html, .htm (max 10MB)
      </p>

      {selectedFile && (
        <div className="mt-4 inline-flex items-center px-3 py-1.5 bg-[#00A99D]/10 text-[#00A99D] rounded-full mx-auto">
          <FileText className="w-4 h-4 mr-2" aria-hidden="true" />
          <span className="text-sm font-semibold">{selectedFile.name}</span>
        </div>
      )}
    </div>
  );
}
