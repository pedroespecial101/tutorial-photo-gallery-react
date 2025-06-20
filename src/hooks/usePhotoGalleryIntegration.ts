import { usePhotoManagement } from './usePhotoManagement';
import { usePhotoUpload } from './usePhotoUpload';
import { useScannedCodes } from './useScannedCodes';
import { usePhotoEditing } from './usePhotoEditing';
import { UserPhoto } from '../types/photoTypes';

// This hook integrates all the separate hooks to provide the same API as the original usePhotoGallery
export function usePhotoGalleryIntegration() {
  const photoManagement = usePhotoManagement();
  const photoUpload = usePhotoUpload();
  const scannedCodes = useScannedCodes();
  const photoEditing = usePhotoEditing();

  // Integrated upload photos function that also clears photos on success
  const uploadPhotos = async (): Promise<void> => {
    try {
      const result = await photoUpload.uploadPhotos(photoManagement.photos, scannedCodes.scannedCodes);
      if (result.success) {
        await photoManagement.clearPhotos();
        scannedCodes.resetScannedCodes();
      }
      // No return value to match Promise<void> signature
    } catch (error) {
      console.error('Error in integrated uploadPhotos:', error);
      throw error; // Re-throw to match the expected void return type
    }
  };

  // Integrated save cropped photo function that updates the photo list
  const saveCroppedPhoto = async (photoToUpdate: UserPhoto, croppedImageBase64: string): Promise<void> => {
    try {
      const { updatedPhotos } = await photoEditing.saveCroppedPhoto(
        photoToUpdate, 
        croppedImageBase64, 
        photoManagement.photos
      );
      
      // Update photos in the management hook
      photoManagement.updatePhotos(updatedPhotos);
    } catch (error) {
      console.error('Failed to save cropped photo in integration:', error);
      throw error; // Re-throw to match the expected void return type with error propagation
    }
  };

  // Function to clear photos and reset scanned codes
  const clearPhotos = async () => {
    await photoManagement.clearPhotos();
    scannedCodes.resetScannedCodes();
  };

  return {
    // Photo management functions
    photos: photoManagement.photos,
    takePhoto: photoManagement.takePhoto,
    pickImages: photoManagement.pickImages,
    deletePhoto: photoManagement.deletePhoto,
    loadSaved: photoManagement.loadSaved,
    
    // Scanned codes functions
    scannedCodes: scannedCodes.scannedCodes,
    processScannedCode: scannedCodes.processScannedCode,
    hasValidSku: scannedCodes.hasValidSku,
    
    // Upload functions
    isUploading: photoUpload.isUploading,
    uploadStatus: photoUpload.uploadStatus,
    hideUploadStatus: photoUpload.hideUploadStatus,
    
    // Photo editing functions
    getOrCreateOriginalForCrop: photoEditing.getOrCreateOriginalForCrop,
    
    // Integrated functions
    uploadPhotos,
    saveCroppedPhoto,
    clearPhotos
  };
}
