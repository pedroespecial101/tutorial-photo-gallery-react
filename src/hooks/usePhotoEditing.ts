import { Preferences } from '@capacitor/preferences';
import { UserPhoto } from '../types/photoTypes';
import { getOrCreateOriginalForCrop as serviceGetOrCreateOriginalForCrop, saveCroppedPhoto as saveEditedPhoto } from '../services/imageEditService';
import { PHOTO_STORAGE } from '../services/storageService';

export function usePhotoEditing() {
  // Get the "_original" file for cropping
  const getOrCreateOriginalForCrop = async (photoForCrop: UserPhoto): Promise<string> => {
    try {
      return await serviceGetOrCreateOriginalForCrop(photoForCrop);
    } catch (error) {
      console.error('Failed to get original photo for cropping', error);
      throw error;
    }
  };

  // Save cropped photo - replace original with cropped version
  const saveCroppedPhoto = async (photoToUpdate: UserPhoto, croppedImageBase64: string, photos: UserPhoto[]): Promise<{updatedPhotos: UserPhoto[]}> => {
    try {
      // Use the image edit service
      const result = await saveEditedPhoto(
        photoToUpdate,
        croppedImageBase64,
        photos
      );
      
      // Save to preferences
      await Preferences.set({
        key: PHOTO_STORAGE, 
        value: JSON.stringify(result.updatedPhotos)
      });
      
      return result;
    } catch (error) {
      console.error('Failed to save cropped photo', error);
      throw error;
    }
  };

  return {
    getOrCreateOriginalForCrop,
    saveCroppedPhoto
  };
}
