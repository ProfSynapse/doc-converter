'use client';

import { FileText, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ConvertingScreenProps {
  fileName: string;
  formats: string[];
  progress: number;
  statusMessage: string;
}

const formatNames: Record<string, string> = {
  docx: 'Word',
  pdf: 'PDF',
  gdocs: 'Google Docs',
};

export function ConvertingScreen({
  fileName,
  formats,
  progress,
  statusMessage,
}: ConvertingScreenProps) {
  const formattedFormats = formats
    .map((f) => formatNames[f] || f)
    .join(', ');

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 sm:p-8">
        <div className="text-center py-12">
          {/* File Info */}
          <div className="mb-8">
            <div className="inline-flex items-center px-6 py-3 bg-[#00A99D]/10 text-[#00A99D] rounded-full mb-4">
              <FileText className="w-6 h-6 mr-3" aria-hidden="true" />
              <span className="text-lg font-semibold">{fileName}</span>
            </div>
            <p className="text-sm text-gray-600">
              Converting to:{' '}
              <span className="font-semibold text-[#33475b]">
                {formattedFormats}
              </span>
            </p>
          </div>

          {/* Large Spinner */}
          <div className="mb-8">
            <Loader2 className="animate-spin h-24 w-24 mx-auto text-[#00A99D]" />
          </div>

          {/* Status Message */}
          <h2 className="text-2xl font-bold text-[#33475b] mb-3">
            {statusMessage}
          </h2>

          {/* Progress Bar */}
          <div className="max-w-md mx-auto" role="status" aria-live="polite">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                {progress < 100 ? 'Uploading...' : 'Complete!'}
              </span>
              <span className="text-sm font-bold text-[#00A99D]">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
