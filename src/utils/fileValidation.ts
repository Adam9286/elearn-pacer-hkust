import { UPLOAD_CONFIG, ALLOWED_TYPES_DISPLAY } from '@/constants/upload';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface FilesValidationResult {
  validFiles: File[];
  errors: string[];
}

/**
 * Validates a single file against upload constraints
 */
export const validateFile = (file: File): FileValidationResult => {
  // Check file size
  if (file.size > UPLOAD_CONFIG.MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `${file.name} exceeds ${UPLOAD_CONFIG.MAX_SIZE_DISPLAY} limit`,
    };
  }

  // Check file type
  if (!UPLOAD_CONFIG.ALLOWED_TYPES.includes(file.type as typeof UPLOAD_CONFIG.ALLOWED_TYPES[number])) {
    return {
      valid: false,
      error: `${file.name} must be ${ALLOWED_TYPES_DISPLAY}`,
    };
  }

  return { valid: true };
};

/**
 * Validates multiple files and returns valid files with any errors
 */
export const validateFiles = (files: File[]): FilesValidationResult => {
  const validFiles: File[] = [];
  const errors: string[] = [];

  files.forEach((file) => {
    const result = validateFile(file);
    if (result.valid) {
      validFiles.push(file);
    } else if (result.error) {
      errors.push(result.error);
    }
  });

  return { validFiles, errors };
};

/**
 * Validates image files specifically (for paste operations)
 */
export const validateImageFile = (file: File): FileValidationResult => {
  // Check file size
  if (file.size > UPLOAD_CONFIG.MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `Image exceeds ${UPLOAD_CONFIG.MAX_SIZE_DISPLAY} limit`,
    };
  }

  // Check if it's an image type
  if (!UPLOAD_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type as typeof UPLOAD_CONFIG.ALLOWED_IMAGE_TYPES[number])) {
    return {
      valid: false,
      error: 'Only PNG, JPG images can be pasted',
    };
  }

  return { valid: true };
};
