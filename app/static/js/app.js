/**
 * Markdown Converter - Main Application Logic
 * Handles UI interactions and file conversion workflow
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  const fileName = document.getElementById('fileName');
  const convertBtn = document.getElementById('convertBtn');
  const convertBtnText = document.getElementById('convertBtnText');
  const formatSelect = document.getElementById('formatSelect');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  const statusMessage = document.getElementById('statusMessage');
  const downloadContainer = document.getElementById('downloadContainer');
  const downloadDocxBtn = document.getElementById('downloadDocx');
  const downloadPdfBtn = document.getElementById('downloadPdf');
  const errorContainer = document.getElementById('errorContainer');
  const errorMessage = document.getElementById('errorMessage');

  // Application State
  let selectedFile = null;
  let currentJobId = null;
  let isProcessing = false;

  // ========== Drag and Drop Handlers ==========

  // Prevent default drag behaviors globally
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Highlight drop zone when dragging over it
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add('drag-over');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('drag-over');
    }, false);
  });

  // Handle dropped files
  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    handleFiles(files);
  }, false);

  // ========== Click to Upload ==========

  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  // ========== File Handling ==========

  function handleFiles(files) {
    if (files.length === 0) return;

    const file = files[0];

    // Validate file
    const validation = api.validateFile(file);
    if (!validation.valid) {
      showError(validation.error);
      resetFileInput();
      return;
    }

    // Store selected file
    selectedFile = file;

    // Update UI
    fileName.textContent = file.name;
    fileNameDisplay.classList.remove('hidden');
    convertBtn.disabled = false;
    hideError();
    hideDownloads();
    hideProgress();
  }

  function resetFileInput() {
    selectedFile = null;
    fileInput.value = '';
    fileNameDisplay.classList.add('hidden');
    convertBtn.disabled = true;
  }

  // ========== Conversion ==========

  convertBtn.addEventListener('click', async () => {
    if (!selectedFile || isProcessing) return;

    try {
      isProcessing = true;
      convertBtn.disabled = true;
      convertBtnText.textContent = 'Converting...';

      const format = formatSelect.value;

      // Show progress
      showProgress('Uploading file...');
      hideError();
      hideDownloads();

      // Upload and convert
      const result = await api.convertFile(
        selectedFile,
        format,
        (progress) => {
          updateProgress(progress, 'Uploading...');
        }
      );

      // Update UI for successful conversion
      updateProgress(100, 'Conversion complete!');
      currentJobId = result.job_id;

      // Show download buttons after short delay
      setTimeout(() => {
        hideProgress();
        showDownloads(result, format);
      }, 500);

    } catch (error) {
      console.error('Conversion error:', error);
      const friendlyError = api.getUserFriendlyError(error);
      showError(friendlyError);
      hideProgress();

    } finally {
      isProcessing = false;
      convertBtn.disabled = false;
      convertBtnText.textContent = 'Convert File';
    }
  });

  // ========== Download Handlers ==========

  downloadDocxBtn.addEventListener('click', () => {
    downloadFile('docx');
  });

  downloadPdfBtn.addEventListener('click', () => {
    downloadFile('pdf');
  });

  async function downloadFile(format) {
    if (!currentJobId) return;

    try {
      // Get base filename without extension
      const baseFilename = selectedFile.name.replace(/\.(md|markdown|txt)$/i, '');
      const downloadFilename = `${baseFilename}.${format}`;

      // Show loading state
      const btn = format === 'docx' ? downloadDocxBtn : downloadPdfBtn;
      const originalText = btn.innerHTML;
      btn.innerHTML = `
        <svg class="animate-spin h-5 w-5 mr-2 inline" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Downloading...
      `;
      btn.disabled = true;

      // Download file
      await api.downloadFile(currentJobId, format, downloadFilename);

      // Reset button
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 1000);

    } catch (error) {
      console.error('Download error:', error);
      const friendlyError = api.getUserFriendlyError(error);
      showError(`Download failed: ${friendlyError}`);

      // Reset button
      const btn = format === 'docx' ? downloadDocxBtn : downloadPdfBtn;
      btn.disabled = false;
    }
  }

  // ========== UI Helper Functions ==========

  function showProgress(message) {
    progressContainer.classList.remove('hidden');
    statusMessage.textContent = message;
    updateProgress(0);
  }

  function hideProgress() {
    progressContainer.classList.add('hidden');
  }

  function updateProgress(percent, message = null) {
    const clampedPercent = Math.min(100, Math.max(0, percent));
    progressBar.style.width = `${clampedPercent}%`;
    progressBar.setAttribute('aria-valuenow', clampedPercent);
    progressPercent.textContent = `${Math.round(clampedPercent)}%`;

    if (message) {
      statusMessage.textContent = message;
    }
  }

  function showDownloads(result, format) {
    downloadContainer.classList.remove('hidden');

    // Show/hide buttons based on selected format
    if (format === 'docx' || format === 'both') {
      downloadDocxBtn.classList.remove('hidden');
    } else {
      downloadDocxBtn.classList.add('hidden');
    }

    if (format === 'pdf' || format === 'both') {
      downloadPdfBtn.classList.remove('hidden');
    } else {
      downloadPdfBtn.classList.add('hidden');
    }
  }

  function hideDownloads() {
    downloadContainer.classList.add('hidden');
  }

  function showError(message) {
    errorContainer.classList.remove('hidden');
    errorMessage.textContent = message;

    // Auto-hide after 10 seconds
    setTimeout(() => {
      hideError();
    }, 10000);
  }

  // Make hideError globally accessible for the close button
  window.hideError = function() {
    errorContainer.classList.add('hidden');
  };

  // ========== Keyboard Shortcuts ==========

  document.addEventListener('keydown', (e) => {
    // Escape key - clear selection
    if (e.key === 'Escape') {
      resetFileInput();
      hideError();
      hideDownloads();
      hideProgress();
    }

    // Enter key - convert if file selected
    if (e.key === 'Enter' && selectedFile && !isProcessing) {
      convertBtn.click();
    }
  });

  // ========== Accessibility ==========

  // Make drop zone keyboard accessible
  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  // ========== Initial State ==========

  console.log('Markdown Converter initialized');
});
