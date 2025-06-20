import { UserPhoto, UploadStatus, ScannedCodes } from '../types/photoTypes';
import { usePhotoGalleryIntegration } from './usePhotoGalleryIntegration';

/**
 * This is now a wrapper around the modular hook implementation,
 * providing the same API as before for backwards compatibility.
 */
export function usePhotoGallery() {
  // Use the integrated hook that combines all functionality
  return usePhotoGalleryIntegration();
}
