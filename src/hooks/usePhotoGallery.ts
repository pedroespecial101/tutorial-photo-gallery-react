import { useState, useEffect } from 'react';
import { detectAndValidateCode, processScannedCode as processCode, hasValidSku as checkValidSku } from '../services/barcodeService';
import { uploadPhotos as uploadToServer } from '../services/uploadService';
import { loadSaved as loadSavedPhotos, clearPhotos as clearStoredPhotos, savePhotosToPreferences, PHOTO_STORAGE, APP_VERSION_STORAGE_KEY } from '../services/storageService';
import { isPlatform } from '@ionic/react';
import { Camera, CameraResultType, CameraSource, Photo, GalleryPhoto, GalleryPhotos } from '@capacitor/camera';
import { Filesystem, Directory, FilesystemEncoding } from '@capacitor/filesystem';
// Import version from package.json
import packageInfo from '../../package.json';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { UserPhoto, UploadStatus, ScannedCodes } from '../types/photoTypes';
import { extractFilename, getWebviewPathForFile, generateHashFromString, generateMD5Hash, base64FromPath } from '../utils/fileUtils';
// Import the photo service functions
import { savePicture, takePhoto, pickImages, deletePhoto } from '../services/photoService';
import { getOrCreateOriginalForCrop, saveCroppedPhoto as saveEditedPhoto } from '../services/imageEditService';

// Storage constants moved to storageService.ts



export function usePhotoGallery() {
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [scannedCodes, setScannedCodes] = useState<ScannedCodes>({
    sku: null,
    ean: null,
    upc: null,
    isbn: null,
    skuDisplay: null,
    eanDisplay: null,
    upcDisplay: null,
    isbnDisplay: null,
    lastScanResult: null
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    message: '',
    color: 'success',
    show: false
  });

  // MD5 hash function is imported from crypto-js at the top of the file

  // Check for new app version and wipe data if necessary
  const checkAppVersionAndReset = async (): Promise<boolean> => {
    try {
      // Get current app version from package.json
      const currentAppVersion = packageInfo.version;
      
      // Get stored app version from preferences
      const { value: storedAppVersion } = await Preferences.get({ key: APP_VERSION_STORAGE_KEY });
      
      console.log(`App version check - Current: ${currentAppVersion}, Stored: ${storedAppVersion || 'not set'}`);
      
      // If versions don't match or no stored version exists, perform a complete wipe
      if (!storedAppVersion || storedAppVersion !== currentAppVersion) {
        console.log(`New app version detected (current: ${currentAppVersion}, previous: ${storedAppVersion || 'none'}). Wiping all photo data.`);
        
        // Wipe everything from filesystem
        try {
          // List files in the data directory
          const result = await Filesystem.readdir({
            directory: Directory.Data,
            path: ''
          });
          
          // Delete all jpeg files
          const imageFiles = result.files.filter(file => file.name.endsWith('.jpeg'));
          
          console.log(`Deleting ${imageFiles.length} image files due to new app version`);
          
          for (const file of imageFiles) {
            try {
              await Filesystem.deleteFile({
                path: file.name,
                directory: Directory.Data
              });
              console.log(`Deleted ${file.name} during version change cleanup`);
            } catch (e) {
              console.error(`Failed to delete ${file.name}:`, e);
            }
          }
        } catch (e) {
          // Directory might not exist yet, which is fine
          console.log('No filesystem directory found during version change cleanup');
        }
        
        // Clear preferences
        await Preferences.set({ key: PHOTO_STORAGE, value: JSON.stringify([]) });
        
        // Update stored version
        await Preferences.set({ key: APP_VERSION_STORAGE_KEY, value: currentAppVersion });
        
        // Clear the photos state
        setPhotos([]);
        
        console.log('Full app data reset completed due to version change');
        return true; // Indicate that a reset occurred
      }
      
      // No version change detected
      return false;
    } catch (error) {
      console.error('Error checking app version:', error);
      return false;
    }
  };

  const loadSaved = async () => {
    try {
      // Use storage service to load and cleanup photos
      const photosInStorage = await loadSavedPhotos(packageInfo.version);
      
      // Update state with loaded photos
      setPhotos(photosInStorage);
    } catch (error) {
      console.error('Error loading saved photos:', error);
      setPhotos([]);
    }
  };

  useEffect(() => {
    loadSaved();
  }, []);

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

  // Get file details for original and main photo
  const getOriginalPhotoFileDetails = (photo: UserPhoto): { originalFilePath: string, mainFileName: string, originalFileName: string } => {
    const mainFileName = extractFilename(photo.filepath);
    // Create the original filename by inserting '_original' before the extension
    const lastDotIndex = mainFileName.lastIndexOf('.');
    let originalFileName = '';
    if (lastDotIndex !== -1) {
      originalFileName = mainFileName.substring(0, lastDotIndex) + '_original' + mainFileName.substring(lastDotIndex);
    } else {
      originalFileName = mainFileName + '_original';
    }
    
    let originalFilePath: string;
    if (isPlatform('hybrid')) {
      // For hybrid, replace the main filename with the original filename in the full path
      originalFilePath = photo.filepath.replace(mainFileName, originalFileName);
    } else {
      // For web, just the filename
      originalFilePath = originalFileName;
    }
    
    return { originalFilePath, mainFileName, originalFileName };
  };
  
  // Get the "_original" file for cropping (we now assume it always exists since we create it at photo capture time)
  const handleGetOrCreateOriginalForCrop = async (photoForCrop: UserPhoto): Promise<string> => {
    try {
      return await getOrCreateOriginalForCrop(photoForCrop);
    } catch (error) {
      console.error('Failed to get original photo for cropping', error);
      throw error;
    }
  };



  // savePicture function moved to photoService.ts

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
      console.log('Clearing photo session and all scanned codes...');
      
      // Use storage service to clear photo files and preferences
      await clearStoredPhotos(photos);
      
      // Clear photos from state
      setPhotos([]);
      
      // Reset all scanned codes AFTER clearing photos to ensure full session reset
      setScannedCodes({
        sku: null,
        ean: null,
        upc: null,
        isbn: null,
        skuDisplay: null,
        eanDisplay: null,
        upcDisplay: null,
        isbnDisplay: null,
        lastScanResult: null
      });
      
      console.log('Photo session and scanned codes cleared successfully');
    } catch (error) {
      console.error('Error clearing photo session:', error);
      throw error;
    }
  };

  const uploadPhotos = async () => {
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
        
        // Clear photos after successful upload
        await clearPhotos();
      } else {
        setUploadStatus({
          message: result.message,
          color: 'danger',
          show: true
        });
      }
    } catch (error) {
      console.error('Error in uploadPhotos:', error);
      setUploadStatus({
        message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        color: 'danger',
        show: true
      });
    } finally {
      setIsUploading(false);
    }
  };

  const hideUploadStatus = () => {
    setUploadStatus(prev => ({ ...prev, show: false }));
  };

  /**
   * Processes a scanned code, detects its type, and updates the appropriate state
   */
  const processScannedCode = (scannedCode: string) => {
    if (!scannedCode) return;
    
    // Use the barcode service to process the code and get the updated state
    const updatedScannedCodes = processCode(scannedCode, scannedCodes);
    
    // Update state with the result
    setScannedCodes(updatedScannedCodes);
  };
  
  /**
   * Check if we have a valid SKU for upload
   */
  const hasValidSku = (): boolean => {
    return checkValidSku(scannedCodes);
  };

  // Save cropped photo - replace original with cropped version using filename-based cache busting
  const handleSaveCroppedPhoto = async (photoToUpdate: UserPhoto, croppedImageBase64: string): Promise<void> => {
    try {
      // Use the image edit service to save the cropped photo
      const { updatedPhotos } = await saveEditedPhoto(
        photoToUpdate,
        croppedImageBase64,
        photos
      );
      
      // Update state and save to preferences
      setPhotos(updatedPhotos);
      await Preferences.set({key: PHOTO_STORAGE, value: JSON.stringify(updatedPhotos)});
    } catch (error) {
      console.error('Failed to save cropped photo', error);
      throw error;
    }
  };

  return {
    deletePhoto: handleDeletePhoto, // Renamed but keep the same export name for compatibility
    photos,
    scannedCodes,
    processScannedCode,
    hasValidSku,
    takePhoto: handleTakePhoto, // Renamed but keep the same export name for compatibility
    pickImages: handlePickImages, // Renamed but keep the same export name for compatibility
    saveCroppedPhoto: handleSaveCroppedPhoto, // Renamed but keep the same export name for compatibility
    uploadPhotos,
    isUploading,
    uploadStatus,
    hideUploadStatus,
    clearPhotos,
    loadSaved,
    getOrCreateOriginalForCrop: handleGetOrCreateOriginalForCrop  // Renamed but keep the same export name for compatibility
  };
}
