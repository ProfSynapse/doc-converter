'use client';

import { Check, Download, ExternalLink, RefreshCw, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { ConversionResult } from '@/lib/api-client';

interface ResultsScreenProps {
  result: ConversionResult;
  originalFileName: string;
  onDownload: (format: 'docx' | 'pdf') => void;
  onConvertAnother: () => void;
  isDownloading: string | null;
}

export function ResultsScreen({
  result,
  originalFileName,
  onDownload,
  onConvertAnother,
  isDownloading,
}: ResultsScreenProps) {
  const hasDocx = result.formats?.docx;
  const hasPdf = result.formats?.pdf;
  const hasGdocs = result.formats?.gdocs;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 sm:p-6">
        {/* Success Message */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-2">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-[#33475b]">
            Conversion Complete!
          </h2>
        </div>

        {/* Download Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {/* Word Download */}
          {hasDocx && (
            <Button
              onClick={() => onDownload('docx')}
              disabled={isDownloading === 'docx'}
              className="flex items-center justify-center p-5 h-auto bg-[#93278f] text-white border-2 border-[#93278f] rounded-lg hover:bg-[#93278f]/90"
              aria-label="Download Word document"
            >
              <div className="relative">
                <Image
                  src="https://img.icons8.com/color/96/microsoft-word-2019--v2.png"
                  alt="Word"
                  width={56}
                  height={56}
                  className="h-14 w-14"
                  unoptimized
                />
                <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-white rounded-full flex items-center justify-center">
                  {isDownloading === 'docx' ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-[#93278f]" />
                  ) : (
                    <Download className="h-4 w-4 text-[#93278f]" />
                  )}
                </div>
              </div>
            </Button>
          )}

          {/* PDF Download */}
          {hasPdf && (
            <Button
              onClick={() => onDownload('pdf')}
              disabled={isDownloading === 'pdf'}
              className="flex items-center justify-center p-5 h-auto bg-[#F7931E] text-white border-2 border-[#F7931E] rounded-lg hover:bg-[#F7931E]/90"
              aria-label="Download PDF document"
            >
              <div className="relative">
                <Image
                  src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg"
                  alt="PDF"
                  width={56}
                  height={56}
                  className="h-14 w-14"
                  unoptimized
                />
                <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-white rounded-full flex items-center justify-center">
                  {isDownloading === 'pdf' ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-[#F7931E]" />
                  ) : (
                    <Download className="h-4 w-4 text-[#F7931E]" />
                  )}
                </div>
              </div>
            </Button>
          )}

          {/* Google Docs Link */}
          {hasGdocs && (
            <a
              href={result.formats!.gdocs!.web_view_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-5 bg-[#29ABE2] text-white border-2 border-[#29ABE2] rounded-lg hover:bg-[#29ABE2]/90 transition-all"
              aria-label="Open Google Docs document"
            >
              <div className="relative">
                <Image
                  src="https://upload.wikimedia.org/wikipedia/commons/0/01/Google_Docs_logo_%282014-2020%29.svg"
                  alt="Google Docs"
                  width={56}
                  height={56}
                  className="h-14 w-14"
                  unoptimized
                />
                <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-white rounded-full flex items-center justify-center">
                  <ExternalLink className="h-4 w-4 text-[#29ABE2]" />
                </div>
              </div>
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            onClick={onConvertAnother}
            className="flex items-center justify-center px-6 py-3 bg-[#00A99D] text-white text-base font-bold rounded-lg hover:bg-[#00A99D]/90"
            aria-label="Convert another file"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Convert Another File
          </Button>

          <a
            href="https://donate.stripe.com/bIY4gsgDo2mJ5kkfZ6"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center px-6 py-3 bg-[#F7931E] text-white text-base font-bold rounded-lg hover:bg-[#F7931E]/90 transition-colors"
          >
            <Coffee className="w-5 h-5 mr-2" />
            Buy us a Coffee
          </a>
        </div>
      </div>
    </div>
  );
}
