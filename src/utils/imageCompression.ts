/**
 * Image compression utilities for avatar uploads
 * Prevents oversized Base64 avatars from breaking authentication
 */

export const MAX_AVATAR_SIZE = 50000; // 50KB max for Base64 (safe for JWT)
export const MAX_DIMENSION = 200; // Max 200x200px for avatars

/**
 * Compress and resize an image file to fit within size constraints
 * @param file - The original image file
 * @param maxSize - Maximum file size in bytes (default 50KB)
 * @param maxDimension - Maximum width/height in pixels (default 200px)
 * @returns Promise with compressed Base64 data URL or error
 */
export async function compressImage(
  file: File,
  maxSize: number = MAX_AVATAR_SIZE,
  maxDimension: number = MAX_DIMENSION
): Promise<{ data?: string; error?: string }> {

  // Check file type
  if (!file.type.startsWith('image/')) {
    return { error: 'File must be an image' };
  }

  // Check initial file size (reject files over 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { error: 'Image file is too large. Please choose an image under 10MB.' };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => {
      resolve({ error: 'Failed to read image file' });
    };

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => {
        resolve({ error: 'Failed to load image' });
      };

      img.onload = () => {
        try {
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve({ error: 'Failed to create canvas context' });
            return;
          }

          // Calculate new dimensions maintaining aspect ratio
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;

          // Draw resized image
          ctx.drawImage(img, 0, 0, width, height);

          // Try different quality levels to get under size limit
          let quality = 0.9;
          let dataUrl = '';

          while (quality > 0.1) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);

            // Check size (Base64 string length approximates final size)
            if (dataUrl.length <= maxSize) {
              resolve({ data: dataUrl });
              return;
            }

            quality -= 0.1;
          }

          // If still too large, reduce dimensions further
          const scaleFactor = 0.7;
          canvas.width = Math.round(width * scaleFactor);
          canvas.height = Math.round(height * scaleFactor);

          // Need to get context again after resizing canvas
          const newCtx = canvas.getContext('2d');
          if (!newCtx) {
            resolve({ error: 'Failed to create canvas context after resize' });
            return;
          }
          newCtx.drawImage(img, 0, 0, canvas.width, canvas.height);

          dataUrl = canvas.toDataURL('image/jpeg', 0.5);

          if (dataUrl.length <= maxSize) {
            resolve({ data: dataUrl });
          } else {
            resolve({
              error: `Image is still too large after compression (${Math.round(dataUrl.length / 1024)}KB). Please choose a smaller image.`
            });
          }
        } catch (error) {
          resolve({ error: 'Failed to compress image' });
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Validate that a Base64 data URL is within size limits
 * @param dataUrl - The Base64 data URL to validate
 * @returns true if valid, false if too large
 */
export function isAvatarSizeValid(dataUrl: string | null | undefined): boolean {
  if (!dataUrl) return true;
  if (!dataUrl.startsWith('data:image')) return true; // Not a data URL, probably an external URL

  return dataUrl.length <= MAX_AVATAR_SIZE;
}

/**
 * Get human-readable size from Base64 string
 * @param dataUrl - The Base64 data URL
 * @returns Size string like "45.2 KB"
 */
export function getBase64Size(dataUrl: string): string {
  const sizeInBytes = dataUrl.length;
  const sizeInKB = sizeInBytes / 1024;

  if (sizeInKB < 1) {
    return `${sizeInBytes} bytes`;
  }

  return `${sizeInKB.toFixed(1)} KB`;
}