import { useState } from 'react';
import { uploadPhotos as uploadToServer } from '../services/uploadService';
import { UploadStatus, UserPhoto, ScannedCodes } from '../types/photoTypes';

export function usePhotoUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    message: '',
    color: 'success',
    show: false
  });

  const uploadPhotos = async (photos: UserPhoto[], scannedCodes: ScannedCodes) => {
    // Set loading state
    setIsUploading(true);
    setUploadStatus(prev => ({ ...prev, show: false }));
    
    try {
      // Call the upload service
      const result = await uploadToServer(photos, scannedCodes);
      
      // Handle the result
      if (result.success) {
        setUploadStatus({
          message: result.message,
          color: 'success',
          show: true
        });
        return { success: true, message: result.message };
      } else {
        setUploadStatus({
          message: result.message,
          color: 'danger',
          show: true
        });
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Error in uploadPhotos:', error);
      const errorMessage = `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;
      
      setUploadStatus({
        message: errorMessage,
        color: 'danger',
        show: true
      });
      
      return { success: false, message: errorMessage };
    } finally {
      setIsUploading(false);
    }
  };

  const hideUploadStatus = () => {
    setUploadStatus(prev => ({ ...prev, show: false }));
  };

  return {
    uploadPhotos,
    isUploading,
    uploadStatus,
    hideUploadStatus
  };
}
