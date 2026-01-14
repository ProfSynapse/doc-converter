'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileUpload } from './file-upload';
import { FormatSelector, FormatType } from './format-selector';
import { ConvertingScreen } from './converting-screen';
import { ResultsScreen } from './results-screen';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X } from 'lucide-react';
import { api, ConversionResult, AuthStatus } from '@/lib/api-client';

type ScreenState = 'upload' | 'converting' | 'results';

export function ConverterFlow() {
  // Screen state
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('upload');

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFormats, setSelectedFormats] = useState<FormatType[]>([]);

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthStatus['user'] | null>(null);

  // Conversion state
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Processing your file...');
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await api.checkAuthStatus();
        setIsAuthenticated(status.authenticated);
        setUser(status.user || null);

        // Restore state after OAuth redirect
        if (status.authenticated) {
          restoreStateAfterOAuth();
        }
      } catch (err) {
        console.error('Failed to check auth status:', err);
      }
    };
    checkAuth();
  }, []);

  // Save state before OAuth redirect
  const saveStateBeforeOAuth = useCallback(async () => {
    if (selectedFile) {
      try {
        const reader = new FileReader();
        const fileContent = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });

        const state = {
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
          fileContent,
          selectedFormats,
          timestamp: Date.now(),
        };
        sessionStorage.setItem('mdconverter_oauth_state', JSON.stringify(state));
      } catch (err) {
        console.error('Failed to save state:', err);
      }
    }
  }, [selectedFile, selectedFormats]);

  // Restore state after OAuth redirect
  const restoreStateAfterOAuth = () => {
    const savedState = sessionStorage.getItem('mdconverter_oauth_state');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        const ageMs = Date.now() - state.timestamp;

        if (ageMs < 5 * 60 * 1000 && state.fileContent) {
          fetch(state.fileContent)
            .then((res) => res.blob())
            .then((blob) => {
              const file = new File([blob], state.fileName, {
                type: state.fileType || 'text/markdown',
              });
              setSelectedFile(file);
              setSelectedFormats(state.selectedFormats || []);
              showMessage('File restored! Ready to convert.');
            })
            .catch((err) => console.error('Failed to restore file:', err));
        }
      } catch (err) {
        console.error('Failed to restore state:', err);
      }
      sessionStorage.removeItem('mdconverter_oauth_state');
    }
  };

  // Show temporary message
  const showMessage = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  // Handle auth required
  const handleAuthRequired = async () => {
    await saveStateBeforeOAuth();
    // Redirect directly to Flask backend for OAuth
    const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL || '';
    window.location.href = `${flaskUrl}/login/google`;
  };

  // Handle format toggle
  const handleFormatToggle = (format: FormatType) => {
    setSelectedFormats((prev) =>
      prev.includes(format)
        ? prev.filter((f) => f !== format)
        : [...prev, format]
    );
  };

  // Handle file select
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
  };

  // Handle conversion
  const handleConvert = async () => {
    if (!selectedFile || selectedFormats.length === 0 || isProcessing) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(0);
      setStatusMessage('Uploading...');
      setCurrentScreen('converting');

      const result = await api.convertFile(
        selectedFile,
        selectedFormats,
        (percent) => {
          setProgress(percent);
          if (percent < 100) {
            setStatusMessage('Uploading...');
          }
        }
      );

      setProgress(100);
      setStatusMessage('Conversion complete!');
      setConversionResult(result);

      // Transition to results after a short delay
      setTimeout(() => {
        setCurrentScreen('results');
      }, 800);
    } catch (err: unknown) {
      console.error('Conversion error:', err);
      const error = err as { authRequired?: boolean; authUrl?: string; error?: string; code?: string };

      if (error.authRequired) {
        setError('Google Docs conversion requires authentication. Please sign in.');
        if (confirm('Sign in with Google now?')) {
          await saveStateBeforeOAuth();
          const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL || '';
          window.location.href = error.authUrl || `${flaskUrl}/login/google`;
        }
      } else {
        setError(api.getUserFriendlyError(error));
      }

      setCurrentScreen('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle download
  const handleDownload = async (format: 'docx' | 'pdf') => {
    if (!conversionResult || !selectedFile) return;

    try {
      setIsDownloading(format);
      const baseFilename = selectedFile.name.replace(/\.(md|markdown|txt|html|htm)$/i, '');
      await api.downloadFile(conversionResult.job_id, format, `${baseFilename}.${format}`);
    } catch (err: unknown) {
      console.error('Download error:', err);
      const error = err as { error?: string; code?: string };
      setError(`Download failed: ${api.getUserFriendlyError(error)}`);
    } finally {
      setTimeout(() => setIsDownloading(null), 1000);
    }
  };

  // Handle convert another
  const handleConvertAnother = () => {
    setSelectedFile(null);
    setSelectedFormats([]);
    setConversionResult(null);
    setProgress(0);
    setError(null);
    setCurrentScreen('upload');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (currentScreen === 'upload') {
          setSelectedFile(null);
          setError(null);
        } else if (currentScreen === 'results') {
          handleConvertAnother();
        }
      }

      if (
        e.key === 'Enter' &&
        currentScreen === 'upload' &&
        selectedFile &&
        selectedFormats.length > 0 &&
        !isProcessing
      ) {
        handleConvert();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentScreen, selectedFile, selectedFormats, isProcessing]);

  const canConvert = selectedFile && selectedFormats.length > 0 && !isProcessing;

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="slide-in">
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
              aria-label="Close error message"
            >
              <X className="h-5 w-5" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Screen */}
      {currentScreen === 'upload' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden animate-in fade-in duration-300">
          <div className="p-4 sm:p-6">
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Left Column: Drop Zone (4/5 width) */}
              <div className="md:col-span-4">
                <FileUpload
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile}
                  onError={setError}
                />
              </div>

              {/* Right Column: Format Icons (1/5 width) */}
              <div className="md:col-span-1">
                <FormatSelector
                  selectedFormats={selectedFormats}
                  onFormatToggle={handleFormatToggle}
                  isAuthenticated={isAuthenticated}
                  onAuthRequired={handleAuthRequired}
                />
              </div>
            </div>

            {/* Convert Button */}
            <div className="mt-4">
              <Button
                onClick={handleConvert}
                disabled={!canConvert}
                className="w-full px-6 py-3 bg-[#00A99D] text-white text-base font-bold rounded-lg hover:bg-[#00A99D]/90 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                aria-label="Convert file"
              >
                Convert File
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Converting Screen */}
      {currentScreen === 'converting' && selectedFile && (
        <div className="animate-in fade-in duration-300">
          <ConvertingScreen
            fileName={selectedFile.name}
            formats={selectedFormats}
            progress={progress}
            statusMessage={statusMessage}
          />
        </div>
      )}

      {/* Results Screen */}
      {currentScreen === 'results' && conversionResult && selectedFile && (
        <div className="animate-in fade-in duration-300">
          <ResultsScreen
            result={conversionResult}
            originalFileName={selectedFile.name}
            onDownload={handleDownload}
            onConvertAnother={handleConvertAnother}
            isDownloading={isDownloading}
          />
        </div>
      )}
    </div>
  );
}
