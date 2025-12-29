export interface ConversionResult {
  job_id: string;
  formats?: {
    docx?: { download_url: string };
    pdf?: { download_url: string };
    gdocs?: { web_view_link: string; document_id: string };
  };
}

export interface AuthStatus {
  authenticated: boolean;
  user?: {
    email: string;
    name: string;
    picture: string;
  };
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const ALLOWED_EXTENSIONS = ['.md', '.markdown', '.txt', '.html', '.htm'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export class MarkdownConverterAPI {
  /**
   * Validate file before upload
   */
  validateFile(file: File): ValidationResult {
    // Check file exists
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
      fileName.endsWith(ext)
    );

    if (!hasValidExtension) {
      return {
        valid: false,
        error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      };
    }

    // Check file is not empty
    if (file.size === 0) {
      return { valid: false, error: 'File is empty' };
    }

    return { valid: true };
  }

  /**
   * Convert file to specified formats
   */
  async convertFile(
    file: File,
    formats: string[],
    onProgress?: (percent: number) => void
  ): Promise<ConversionResult> {
    const formData = new FormData();
    formData.append('file', file);
    formats.forEach((format) => formData.append('formats', format));

    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const response = JSON.parse(xhr.responseText);

          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(response);
          } else {
            // Check for auth required error
            if (xhr.status === 401 && response.auth_url) {
              reject({
                ...response,
                authRequired: true,
                authUrl: response.auth_url,
              });
            } else {
              reject(response);
            }
          }
        } catch {
          reject({ error: 'Invalid response from server' });
        }
      });

      xhr.addEventListener('error', () => {
        reject({ error: 'Network error occurred' });
      });

      xhr.addEventListener('timeout', () => {
        reject({ error: 'Request timed out' });
      });

      xhr.open('POST', '/api/convert');
      xhr.timeout = 300000; // 5 minute timeout
      xhr.send(formData);
    });
  }

  /**
   * Download a converted file
   */
  async downloadFile(
    jobId: string,
    format: string,
    filename: string
  ): Promise<void> {
    const response = await fetch(`/api/download/${jobId}/${format}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Download failed' }));
      throw error;
    }

    // Create blob and trigger download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * Check authentication status
   */
  async checkAuthStatus(): Promise<AuthStatus> {
    const response = await fetch('/api/auth/status');
    return response.json();
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyError(error: { error?: string; code?: string }): string {
    const errorMessages: Record<string, string> = {
      INVALID_FILE_TYPE: 'Please upload a valid markdown or HTML file',
      FILE_TOO_LARGE: 'File size exceeds the 10MB limit',
      EMPTY_FILE: 'The uploaded file is empty',
      CONVERSION_FAILED: 'Failed to convert the file. Please try again',
      AUTH_REQUIRED: 'Please sign in to use Google Docs conversion',
      NETWORK_ERROR: 'Network error. Please check your connection',
    };

    if (error.code && errorMessages[error.code]) {
      return errorMessages[error.code];
    }

    return error.error || 'An unexpected error occurred';
  }
}

export const api = new MarkdownConverterAPI();
