'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import Image from 'next/image';

export type FormatType = 'docx' | 'pdf' | 'gdocs';

interface Format {
  id: FormatType;
  name: string;
  icon: string;
  color: string;
  borderColor: string;
  bgColor: string;
  requiresAuth?: boolean;
}

const formats: Format[] = [
  {
    id: 'docx',
    name: 'Microsoft Word',
    icon: 'https://img.icons8.com/color/96/microsoft-word-2019--v2.png',
    color: '#93278f',
    borderColor: 'border-[#93278f]',
    bgColor: 'bg-[#93278f]/5',
  },
  {
    id: 'pdf',
    name: 'PDF',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg',
    color: '#F7931E',
    borderColor: 'border-[#F7931E]',
    bgColor: 'bg-[#F7931E]/5',
  },
  {
    id: 'gdocs',
    name: 'Google Docs',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/0/01/Google_Docs_logo_%282014-2020%29.svg',
    color: '#29ABE2',
    borderColor: 'border-[#29ABE2]',
    bgColor: 'bg-[#29ABE2]/5',
    requiresAuth: true,
  },
];

interface FormatSelectorProps {
  selectedFormats: FormatType[];
  onFormatToggle: (format: FormatType) => void;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
}

export function FormatSelector({
  selectedFormats,
  onFormatToggle,
  isAuthenticated,
  onAuthRequired,
}: FormatSelectorProps) {
  const handleFormatClick = (format: Format) => {
    if (format.requiresAuth && !isAuthenticated) {
      onAuthRequired();
      return;
    }
    onFormatToggle(format.id);
  };

  return (
    <fieldset className="h-full flex flex-col justify-center">
      <legend className="sr-only">Select output formats</legend>

      <div className="flex md:flex-col flex-row gap-2 justify-center">
        {formats.map((format) => {
          const isSelected = selectedFormats.includes(format.id);
          const isDisabled = format.requiresAuth && !isAuthenticated;

          return (
            <button
              key={format.id}
              type="button"
              onClick={() => handleFormatClick(format)}
              aria-label={`${format.name} format${isDisabled ? ' (click to sign in)' : ''}`}
              aria-pressed={isSelected}
              className={cn(
                'relative flex items-center justify-center aspect-square p-3 bg-white border-2 rounded-lg cursor-pointer transition-all duration-200',
                'hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                isSelected && [format.borderColor, format.bgColor],
                !isSelected && 'border-gray-300',
                `hover:${format.borderColor}`,
                `focus-visible:ring-[${format.color}]`
              )}
              style={{
                '--format-color': format.color,
              } as React.CSSProperties}
            >
              {/* Icon */}
              <Image
                src={format.icon}
                alt={format.name}
                width={64}
                height={64}
                className="h-16 w-16"
                unoptimized // External URLs
              />

              {/* Checkmark indicator */}
              {isSelected && (
                <span
                  className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 rounded-full"
                  style={{ backgroundColor: format.color }}
                >
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
