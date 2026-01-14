import { externalSupabase } from '@/lib/externalSupabase';
import { computeFileHash } from '@/utils/fileHash';

interface UploadResult {
  url: string;
  name: string;
  type: string;
  isDuplicate: boolean;
}

/**
 * Upload an attachment with duplicate detection.
 * Files are stored in user-specific folders (userId/hash_filename or guest/hash_filename).
 * If a file with the same hash already exists, returns the existing URL instead of uploading again.
 */
export async function uploadAttachment(
  file: File,
  userId: string | null
): Promise<UploadResult | null> {
  try {
    // Compute file hash for duplicate detection
    const fileHash = await computeFileHash(file);
    const folder = userId || 'guest';
    const hashedFileName = `${fileHash}_${file.name}`;
    const filePath = `${folder}/${hashedFileName}`;

    // Check if file already exists (duplicate detection)
    const { data: existingFile } = await externalSupabase.storage
      .from('chat-attachments')
      .list(folder, {
        search: hashedFileName,
      });

    if (existingFile && existingFile.length > 0) {
      // File already exists, return existing URL
      const { data: urlData } = externalSupabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      console.log(`♻️ Duplicate detected: ${file.name} (reusing existing file)`);
      
      return {
        url: urlData.publicUrl,
        name: file.name,
        type: file.type,
        isDuplicate: true,
      };
    }

    // Upload new file
    const { data: uploadData, error: uploadError } = await externalSupabase.storage
      .from('chat-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: urlData } = externalSupabase.storage
      .from('chat-attachments')
      .getPublicUrl(uploadData.path);

    console.log(`✅ Uploaded new file: ${file.name}`);

    return {
      url: urlData.publicUrl,
      name: file.name,
      type: file.type,
      isDuplicate: false,
    };
  } catch (error) {
    console.error('Error in uploadAttachment:', error);
    return null;
  }
}

/**
 * Upload multiple attachments with duplicate detection.
 * Returns array of successful uploads with their URLs.
 */
export async function uploadAttachments(
  files: File[],
  userId: string | null
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  
  for (const file of files) {
    const result = await uploadAttachment(file, userId);
    if (result) {
      results.push(result);
    }
  }

  const duplicates = results.filter(r => r.isDuplicate).length;
  const newUploads = results.filter(r => !r.isDuplicate).length;
  
  if (duplicates > 0) {
    console.log(`📊 Upload summary: ${newUploads} new, ${duplicates} duplicates reused`);
  }

  return results;
}
