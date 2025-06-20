import { useState, useEffect } from 'react';
import { Photo } from '@capacitor/camera';
import { UserPhoto } from '../types/photoTypes';
import { takePhoto, pickImages, deletePhoto, savePicture } from '../services/photoService';
import { loadSaved as loadSavedPhotos, savePhotosToPreferences, 
         clearPhotos as clearStoredPhotos, PHOTO_STORAGE } from '../services/storageService';

export function usePhotoManagement() {
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  
  // Load saved photos on initialization
  useEffect(() => {
    loadSaved();
  }, []);

  const loadSaved = async () => {
    try {
      // Use storage service to load and cleanup photos
      const photosInStorage = await loadSavedPhotos(require('../../package.json').version);
      
      // Update state with loaded photos
      setPhotos(photosInStorage);
    } catch (error) {
      console.error('Error loading saved photos:', error);
      setPhotos([]);
    }
  };

  const handleTakePhoto = async () => {
    const photo = await takePhoto();

    const fileName = new Date().getTime() + '.jpeg';
    const savedFileImage = await savePicture(photo, fileName);

    const newPhotos = [savedFileImage, ...photos];
    setPhotos(newPhotos);
    await savePhotosToPreferences(newPhotos);
  };

  const handlePickImages = async () => {
    const galleryPhotos = await pickImages();
    
    const newPhotos = [...photos]; // Start with existing photos
    
    // Process each selected photo
    for (const galleryPhoto of galleryPhotos.photos) {
      const fileName = new Date().getTime() + Math.floor(Math.random() * 1000) + '.jpeg';
      
      // Create a Photo object compatible with savePicture
      const photoToSave: Photo = {
        path: galleryPhoto.path,
        webPath: galleryPhoto.webPath,
        format: 'jpeg',
        saved: false
      };
      
      const savedFileImage = await savePicture(photoToSave, fileName);
      newPhotos.unshift(savedFileImage); // Add to beginning of array
    }
    
    setPhotos(newPhotos);
    await savePhotosToPreferences(newPhotos);
  };

  const handleDeletePhoto = async (photo: UserPhoto) => {
    // Remove this photo from the Photos reference data array
    const newPhotos = photos.filter(p => p.filepath !== photo.filepath);

    // Update photos array cache by overwriting the existing photo array
    await savePhotosToPreferences(newPhotos);

    try {
      // Delete the photo from filesystem using the service
      await deletePhoto(photo);
    } catch (error) {
      console.error('Failed to delete photo', error);
    }
    
    setPhotos(newPhotos);
  };

  const clearPhotos = async () => {
    try {
      console.log('Clearing photo session...');
      
      // Use storage service to clear photo files and preferences
      await clearStoredPhotos(photos);
      
      // Clear photos from state
      setPhotos([]);
      
      console.log('Photo session cleared successfully');
    } catch (error) {
      console.error('Error clearing photo session:', error);
      throw error;
    }
  };

  // Function to update photos array (useful for integration)
  const updatePhotos = (newPhotos: UserPhoto[]) => {
    setPhotos(newPhotos);
  };

  return {
    photos,
    takePhoto: handleTakePhoto,
    pickImages: handlePickImages,
    deletePhoto: handleDeletePhoto,
    clearPhotos,
    loadSaved,
    updatePhotos
  };
}
