// File upload configuration constants
// Centralized limits and allowed types

export const UPLOAD_CONFIG = {
  // Maximum file size in bytes (20MB)
  MAX_SIZE_BYTES: 20 * 1024 * 1024,
  
  // Maximum file size for display
  MAX_SIZE_DISPLAY: '20MB',
  
  // Allowed MIME types for chat attachments
  ALLOWED_TYPES: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'text/plain',
  ] as const,
  
  // Image-only MIME types (for paste operations)
  ALLOWED_IMAGE_TYPES: [
    'image/png',
    'image/jpeg',
    'image/jpg',
  ] as const,
} as const;

// Human-readable file type descriptions
export const ALLOWED_TYPES_DISPLAY = 'PDF, PNG, JPG, or TXT';
