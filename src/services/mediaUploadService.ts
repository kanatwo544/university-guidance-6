import { storage } from '../config/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export type MediaType = 'image' | 'video' | 'file';

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

export const uploadMedia = (
  file: File,
  mediaType: MediaType,
  onProgress: (progress: UploadProgress) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storagePath = `chat_media/${mediaType}s/${fileName}`;

      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress({
            progress,
            status: 'uploading',
          });
        },
        (error) => {
          console.error('Upload error:', error);
          onProgress({
            progress: 0,
            status: 'error',
            error: error.message,
          });
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            onProgress({
              progress: 100,
              status: 'completed',
              url: downloadURL,
            });
            resolve(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', error);
            reject(error);
          }
        }
      );
    } catch (error) {
      console.error('Error starting upload:', error);
      reject(error);
    }
  });
};

export const getMediaTypeFromFile = (file: File): MediaType => {
  const type = file.type.toLowerCase();

  if (type.startsWith('image/')) {
    return 'image';
  } else if (type.startsWith('video/')) {
    return 'video';
  } else {
    return 'file';
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
