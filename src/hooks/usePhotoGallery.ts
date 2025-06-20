import { useState, useEffect } from 'react';
import { detectAndValidateCode, BarcodeResult } from '../services/barcodeService';
import { isPlatform } from '@ionic/react';
import { Camera, CameraResultType, CameraSource, Photo, GalleryPhoto, GalleryPhotos } from '@capacitor/camera';
import { Filesystem, Directory, FilesystemEncoding } from '@capacitor/filesystem';
// Import version from package.json
import packageInfo from '../../package.json';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import MD5 from 'crypto-js/md5';

export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
  fileName?: string;
}

export interface UploadStatus {
  message: string;
  color: 'success' | 'danger' | 'warning';
  show: boolean;
}

export interface ScannedCodes {
  sku: string | null;
  ean: string | null;
  upc: string | null;
  isbn: string | null;
  // Display versions with original formatting
  skuDisplay: string | null;
  eanDisplay: string | null;
  upcDisplay: string | null;
  isbnDisplay: string | null;
  lastScanResult: BarcodeResult | null;
}

const PHOTO_STORAGE = 'photos';
const APP_VERSION_STORAGE_KEY = 'appVersion';

// Helper function to extract just the filename from a filepath
const extractFilename = (filepath: string): string => {
  if (isPlatform('hybrid')) {
    // For hybrid platforms, extract only the file name from the full URI
    const docsSegmentIndex = filepath.lastIndexOf('Documents/');
    
    if (docsSegmentIndex !== -1) {
      // Get everything after 'Documents/'
      let filename = filepath.substring(docsSegmentIndex + 'Documents/'.length);
      
      // Remove any trailing slash
      if (filename.endsWith('/')) {
        filename = filename.slice(0, -1);
      }
      return filename;
    } else {
      // Fallback to just taking the part after the last '/'
      let filename = filepath.substr(filepath.lastIndexOf('/') + 1);
      
      // Remove any trailing slash
      if (filename.endsWith('/')) {
        filename = filename.slice(0, -1);
      }
      return filename;
    }
  } else {
    // For web, filepath is already just the filename
    return filepath;
  }
};

// Helper function to get a displayable webview path for a file
const getWebviewPathForFile = async (filePath: string, directory: Directory = Directory.Data): Promise<string> => {
  if (isPlatform('hybrid')) {
    // For hybrid platforms, convert file path to HTTP
    // Check if the path is already a full URI (begins with file://)
    if (filePath.startsWith('file://')) {
      // Path is already a full URI
      return Capacitor.convertFileSrc(filePath);
    } else {
      // Try to read the file using Filesystem API to make sure it exists
      try {
        await Filesystem.stat({
          path: filePath,
          directory: directory
        });
        
        // Get the full URI for the file
        const fileInfo = await Filesystem.getUri({
          path: filePath,
          directory: directory
        });
        
        return Capacitor.convertFileSrc(fileInfo.uri);
      } catch (error) {
        console.error(`Failed to get URI for file ${filePath}:`, error);
        throw error;
      }
    }
  } else {
    // For web platform, read as base64 data
    const file = await Filesystem.readFile({
      path: filePath,
      directory: directory
    });
    return `data:image/jpeg;base64,${file.data}`;
  }
};

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
    console.log('Starting app initialization');
    
    // Check for new app version first and reset if needed
    const wasReset = await checkAppVersionAndReset();
    
    // If a reset occurred, we can skip loading saved photos since we just wiped them
    if (wasReset) {
      console.log('Skipping photo loading after app reset');
      return;
    }
    
    console.log('Loading saved photos');
    const { value } = await Preferences.get({ key: PHOTO_STORAGE });
    
    const photosInStorage = (value ? JSON.parse(value) : []) as UserPhoto[];
    
    // If running on the web platform...
    if (!isPlatform('hybrid')) {
      for (let photo of photosInStorage) {
        // Read each photo from the filesystem into the webviewPath
        if (photo.filepath) {
          const file = await Filesystem.readFile({
            path: photo.filepath,
            directory: Directory.Data
          });
          
          photo.webviewPath = `data:image/jpeg;base64,${file.data}`;
        }
      }
    }
    
    setPhotos(photosInStorage);            
    await cleanupPhotosStorage();
  };

  useEffect(() => {
    loadSaved();
  }, []);

  const takePhoto = async () => {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100
    });

    const fileName = new Date().getTime() + '.jpeg';
    const savedFileImage = await savePicture(photo, fileName);

    const newPhotos = [savedFileImage, ...photos];
    setPhotos(newPhotos);
    Preferences.set({key: PHOTO_STORAGE,value: JSON.stringify(newPhotos)});
  };

  const pickImages = async () => {
    const galleryPhotos = await Camera.pickImages({
      quality: 90,
      limit: 10
    });
    
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
    Preferences.set({key: PHOTO_STORAGE, value: JSON.stringify(newPhotos)});
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
  const getOrCreateOriginalForCrop = async (photoForCrop: UserPhoto): Promise<string> => {
    try {
      // Extract just the filename part from the filepath
      const mainFilename = extractFilename(photoForCrop.filepath);

      // Create a filename for the original version
      const lastDotIndex = mainFilename.lastIndexOf('.');
      const originalFilename = lastDotIndex !== -1 ? 
        mainFilename.substring(0, lastDotIndex) + '_original' + mainFilename.substring(lastDotIndex) : 
        mainFilename + '_original';

      console.log(`Getting original file for cropping: ${originalFilename}`);
      
      // Read the original file's contents - we now assume it exists since we create it at photo capture time
      try {
        const originalFile = await Filesystem.readFile({
          path: originalFilename,
          directory: Directory.Data
        });
        
        // Return the base64 data with proper data URL prefix
        return `data:image/jpeg;base64,${originalFile.data}`;
      } catch (e) {
        // If for some reason the original doesn't exist (shouldn't happen), log and throw
        console.error(`Error: Original file ${originalFilename} not found. This indicates a problem with our backup process.`, e);
        throw new Error(`Original file not found: ${originalFilename}. Photo management inconsistency detected.`);
      }
    } catch (error) {
      console.error('Failed to get original photo for cropping', error);
      throw error;
    }
  };

  // Create a simple hash from a string for cache busting (legacy method)
  const generateHashFromString = (input: string): string => {
    let hash = 0;
    if (input.length === 0) return hash.toString();
    
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Convert to a positive hex string
    return Math.abs(hash).toString(16);
  };
  
  // Generate MD5 hash of a base64 string or any other content
  const generateMD5Hash = (content: string): string => {
    // Limit input size for performance in case of large files
    const sampleContent = content.length > 10000 ? content.substring(0, 10000) : content;
    return MD5(sampleContent).toString();
  };

  const savePicture = async (photo: Photo, fileName: string): Promise<UserPhoto> => {
    let base64Data: string;
    // "hybrid" will detect Cordova or Capacitor;
    if (isPlatform('hybrid')) {
      const file = await Filesystem.readFile({
        path: photo.path!
      });
      base64Data = file.data as string;
    } else {
      base64Data = await base64FromPath(photo.webPath!);
    }
    
    // Generate an MD5 hash from the image data for a unique identifier
    const md5Hash = generateMD5Hash(base64Data);
    
    // Insert the MD5 hash into the filename
    const lastDotIndex = fileName.lastIndexOf('.');
    const fileNameWithoutExt = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
    const extension = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '.jpeg';
    const hashedFileName = `${fileNameWithoutExt}_${md5Hash}${extension}`;
    
    console.log(`Saving original photo with hashed filename: ${hashedFileName}`);
    
    const savedFile = await Filesystem.writeFile({
      path: hashedFileName,
      data: base64Data,
      directory: Directory.Data
    });

    if (isPlatform('hybrid')) {
      // Display the new image by rewriting the 'file://' path to HTTP
      // Details: https://ionicframework.com/docs/building/webview#file-protocol
      
      // FIX: Remove any trailing slash from the URI to prevent file access errors
      let filepath = savedFile.uri;
      if (filepath.endsWith('/')) {
        filepath = filepath.slice(0, -1);
        console.log('Fixed path with trailing slash:', filepath);
      }

      // Create a UserPhoto object with the saved file path
      const savedPhoto: UserPhoto = {
        filepath: filepath,
        webviewPath: Capacitor.convertFileSrc(filepath),
        fileName: hashedFileName
      };

      // Create a backup of this original photo for future cropping operations
      try {
        // Extract the filename for creating the original backup
        const mainFileName = extractFilename(filepath);
        const lastDotIndex = mainFileName.lastIndexOf('.');
        // Create the original backup with the same hash to maintain relationship
        const originalFileName = lastDotIndex !== -1 ? 
          mainFileName.substring(0, lastDotIndex) + '_original' + mainFileName.substring(lastDotIndex) : 
          mainFileName + '_original';
        
        console.log(`Creating initial backup of original image: ${originalFileName}`);
        
        // Copy the original image data to the backup file
        await Filesystem.writeFile({
          path: originalFileName,
          data: base64Data,
          directory: Directory.Data
        });
      } catch (error) {
        console.error('Failed to create backup of original photo:', error);
        // Continue even if backup fails - just log the error
      }
      
      return savedPhoto;
    }
    else {
      // For web platform
      const savedPhoto: UserPhoto = {
        filepath: hashedFileName,
        webviewPath: photo.webPath,
        fileName: hashedFileName
      };

      // Create a backup of this original photo for future cropping operations
      try {
        const lastDotIndex = hashedFileName.lastIndexOf('.');
        const originalFileName = lastDotIndex !== -1 ? 
          hashedFileName.substring(0, lastDotIndex) + '_original' + hashedFileName.substring(lastDotIndex) : 
          hashedFileName + '_original';
        
        console.log(`Creating initial backup of original image: ${originalFileName}`);
        
        // Copy the original image data to the backup file
        await Filesystem.writeFile({
          path: originalFileName,
          data: base64Data,
          directory: Directory.Data
        });
      } catch (error) {
        console.error('Failed to create backup of original photo:', error);
        // Continue even if backup fails - just log the error
      }
      
      return savedPhoto;
    }
  };

  const deletePhoto = async (photo: UserPhoto) => {
    // Remove this photo from the Photos reference data array
    const newPhotos = photos.filter(p => p.filepath !== photo.filepath);

    // Update photos array cache by overwriting the existing photo array
    Preferences.set({key: PHOTO_STORAGE, value: JSON.stringify(newPhotos) });

    try {
      // Extract the correct filename based on platform
      let filename: string;
      
      if (isPlatform('hybrid')) {
        // For hybrid platforms, extract only the file name from the full URI
        // This handles paths like: file:///var/mobile/.../.../Documents/1234.jpeg
        
        // First find the last segment containing 'Documents/'
        const docsSegmentIndex = photo.filepath.lastIndexOf('Documents/');
        
        if (docsSegmentIndex !== -1) {
          // Get everything after 'Documents/'
          filename = photo.filepath.substring(docsSegmentIndex + 'Documents/'.length);
          
          // Remove any trailing slash
          if (filename.endsWith('/')) {
            filename = filename.slice(0, -1);
          }
        } else {
          // Fallback to just taking the part after the last '/'
          filename = photo.filepath.substr(photo.filepath.lastIndexOf('/') + 1);
          
          // Remove any trailing slash
          if (filename.endsWith('/')) {
            filename = filename.slice(0, -1);
          }
        }
        
        console.log(`Deleting file: ${filename} from hybrid path: ${photo.filepath}`);
      } else {
        // For web, filepath is already just the filename
        filename = photo.filepath;
        console.log(`Deleting file: ${filename} from web path`);
      }
      
      // Delete photo file from filesystem
      await Filesystem.deleteFile({
        path: filename,
        directory: Directory.Data
      });
    } catch (error) {
      console.error('Failed to delete photo', error);
    }
    
    setPhotos(newPhotos);
  };

  // Clean up photo storage on startup
  const cleanupPhotosStorage = async () => {
    try {
      // Get stored photo metadata from preferences
      const { value } = await Preferences.get({ key: PHOTO_STORAGE });
      const storedPhotos = (value ? JSON.parse(value) : []) as UserPhoto[];
      
      // If no photos are stored, nothing to clean up
      if (storedPhotos.length === 0) {
        console.log('No photos in preferences, nothing to clean up');
        return;
      }
      
      console.log(`Found ${storedPhotos.length} photo(s) in preferences`);
      
      // Get actual files from filesystem
      let filesInStorage: string[] = [];
      try {
        const result = await Filesystem.readdir({
          directory: Directory.Data,
          path: ''
        });
        filesInStorage = result.files.map(file => file.name).filter(name => name.endsWith('.jpeg'));
        console.log(`Found ${filesInStorage.length} jpeg file(s) in filesystem`);
        // Output the full filenames of the files in the filesystem
        console.log('Files in filesystem:', filesInStorage);
      } catch (e) {
        // Directory might not exist yet, which is fine for first run
        console.log('No photo directory found, checking if we need to clear preferences');
        
        // If directory doesn't exist but we have tracked files, clear them
        if (storedPhotos.length > 0) {
          console.log('Tracked files registered but no filesystem directory found - clearing all tracked files');
          await Preferences.set({ key: PHOTO_STORAGE, value: JSON.stringify([]) });
          setPhotos([]);
        }
        return;
      }

      // Extract tracked filenames from stored photos metadata
      const trackedFilenames = storedPhotos.map(photo => {
        // Extract filename properly based on platform
        let filename: string;
        
        if (isPlatform('hybrid')) {
          // For hybrid platforms, extract only the file name from the full URI
          const docsSegmentIndex = photo.filepath.lastIndexOf('Documents/');
          
          if (docsSegmentIndex !== -1) {
            // Get everything after 'Documents/'
            filename = photo.filepath.substring(docsSegmentIndex + 'Documents/'.length);
            
            // Remove any trailing slash
            if (filename.endsWith('/')) {
              filename = filename.slice(0, -1);
            }
          } else {
            // Fallback to just taking the part after the last '/'
            filename = photo.filepath.substr(photo.filepath.lastIndexOf('/') + 1);
            
            // Remove any trailing slash
            if (filename.endsWith('/')) {
              filename = filename.slice(0, -1);
            }
          }
        } else {
          // For web, filepath is already just the filename
          filename = photo.filepath;
        }
        
        return filename;
      });
      
      // Also add the corresponding _original filenames to the tracked list
      const trackedOriginalFilenames = trackedFilenames.map(filename => {
        const lastDotIndex = filename.lastIndexOf('.');
        return lastDotIndex !== -1 ? 
          filename.substring(0, lastDotIndex) + '_original' + filename.substring(lastDotIndex) : 
          filename + '_original';
      });
      
      // Combine both sets of tracked filenames
      const allTrackedFilenames = [...trackedFilenames, ...trackedOriginalFilenames];
      console.log('Currently tracking these files:', allTrackedFilenames);
      
      // First, check for missing tracked files (files in preferences but not on filesystem)
      // This specifically addresses the phantom image issue after builds
      const missingFiles = allTrackedFilenames.filter(filename => !filesInStorage.includes(filename));
      if (missingFiles.length > 0) {
        console.log('Tracked files registered but not found on filesystem:', missingFiles);
      }

      // Delete orphaned files (files that exist in filesystem but are not tracked)
      for (const filename of filesInStorage) {
        if (!allTrackedFilenames.includes(filename)) {
          console.log(`Cleaning up orphaned file: ${filename}`);
          await Filesystem.deleteFile({
            path: filename,
            directory: Directory.Data
          });
        }
      }

      // Clean up metadata that points to missing files
      const validPhotos = storedPhotos.filter(photo => {
        // Extract filename properly
        let filename: string;
        
        if (isPlatform('hybrid')) {
          // For hybrid platforms, extract only the file name from the full URI
          const docsSegmentIndex = photo.filepath.lastIndexOf('Documents/');
          
          if (docsSegmentIndex !== -1) {
            // Get everything after 'Documents/'
            filename = photo.filepath.substring(docsSegmentIndex + 'Documents/'.length);
            
            // Remove any trailing slash
            if (filename.endsWith('/')) {
              filename = filename.slice(0, -1);
            }
          } else {
            // Fallback to just taking the part after the last '/'
            filename = photo.filepath.substr(photo.filepath.lastIndexOf('/') + 1);
            
            // Remove any trailing slash
            if (filename.endsWith('/')) {
              filename = filename.slice(0, -1);
            }
          }
        } else {
          // For web, filepath is already just the filename
          filename = photo.filepath;
        }
        
        // This is the key check: ensure the file actually exists in the filesystem
        const fileExists = filesInStorage.includes(filename);
        if (!fileExists) {
          console.log(`Removing phantom image entry for missing file: ${filename}`);
        }
        return fileExists;
      });

      // Update preferences with clean list
      if (validPhotos.length !== storedPhotos.length) {
        console.log(`Cleaned up ${storedPhotos.length - validPhotos.length} phantom image entries`);
        await Preferences.set({ key: PHOTO_STORAGE, value: JSON.stringify(validPhotos) });
        setPhotos(validPhotos);
      } else if (missingFiles.length > 0) {
        console.log('All tracked photos still valid after filesystem check');
      }
    } catch (error) {
      console.error('Failed to cleanup photos storage', error);
    }
  };

  // Helper function for web support
  const base64FromPath = async (path: string): Promise<string> => {
    const response = await fetch(path);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject('method did not return a string')
        }
      };
      reader.readAsDataURL(blob);
    });
  };

  const clearPhotos = async () => {
    try {
      console.log('Clearing photo session and all scanned codes...');
      
      // Keep track of files that need to be deleted
      const filesToDelete = new Set<string>();
      
      // Identify all photo files and their _original counterparts
      for (const photo of photos) {
        try {
          let filename: string;
          
          if (isPlatform('hybrid')) {
            // Extract filename from full path
            const docsSegmentIndex = photo.filepath.lastIndexOf('Documents/');
            
            if (docsSegmentIndex !== -1) {
              filename = photo.filepath.substring(docsSegmentIndex + 'Documents/'.length);
              if (filename.endsWith('/')) {
                filename = filename.slice(0, -1);
              }
            } else {
              filename = photo.filepath.substr(photo.filepath.lastIndexOf('/') + 1);
              if (filename.endsWith('/')) {
                filename = filename.slice(0, -1);
              }
            }
          } else {
            filename = photo.filepath;
          }
          
          // Add main photo file to deletion list
          filesToDelete.add(filename);
          
          // Create and add _original backup filename to deletion list
          const lastDotIndex = filename.lastIndexOf('.');
          const originalFilename = lastDotIndex !== -1 ? 
            filename.substring(0, lastDotIndex) + '_original' + filename.substring(lastDotIndex) : 
            filename + '_original';
          
          filesToDelete.add(originalFilename);
        } catch (error) {
          console.error('Error processing file for deletion:', photo.filepath, error);
        }
      }
      
      // Delete all identified files
      for (const filename of filesToDelete) {
        try {
          await Filesystem.deleteFile({
            path: filename,
            directory: Directory.Data
          });
          console.log(`Deleted file: ${filename}`);
        } catch (error) {
          console.error('Error deleting file:', filename, error);
          // Continue with other files even if one fails
        }
      }
      
      // Clear photos from state and preferences
      setPhotos([]);
      await Preferences.set({ key: PHOTO_STORAGE, value: JSON.stringify([]) });
      
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
    }
  };

  const uploadPhotos = async () => {
    if (photos.length === 0) {
      setUploadStatus({
        message: 'No photos to upload',
        color: 'warning',
        show: true
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus(prev => ({ ...prev, show: false }));
    
    try {
      console.log('Starting photo upload process...');
      
      const formData = new FormData();
      // Use detected SKU or fallback to hardcoded value
      formData.append('sku', scannedCodes.sku || 'IOS-Test1');
      formData.append('debug', 'true');
      
      // Add other code types if available
      if (scannedCodes.ean) {
        formData.append('ean', scannedCodes.ean);
      }
      if (scannedCodes.upc) {
        formData.append('upc', scannedCodes.upc);
      }
      if (scannedCodes.isbn) {
        formData.append('isbn', scannedCodes.isbn);
      }
      
      // Process each photo and add to FormData
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        
        if (!photo.webviewPath) {
          throw new Error(`Photo ${i} has no webviewPath`);
        }
        
        const fileName = photo.filepath.slice(photo.filepath.lastIndexOf('/') + 1);
        const response = await fetch(photo.webviewPath);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch image ${fileName}: ${response.status}`);
        }
        
        const fileData = await response.blob();
        formData.append('images', fileData, fileName);
      }
      
      // Upload to API
      const response = await fetch('https://api.petetreadaway.com/api/image-upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        setUploadStatus({
          message: 'Images uploaded successfully! Starting new session...',
          color: 'success',
          show: true
        });
        
        // Clear photos after successful upload
        await clearPhotos();
      } else {
        const errorText = await response.text();
        setUploadStatus({
          message: `Upload failed: ${response.status} ${errorText}`,
          color: 'danger',
          show: true
        });
      }
      
    } catch (error) {
      console.error('Error uploading images:', error);
      setUploadStatus({
        message: `Error uploading images: ${error instanceof Error ? error.message : String(error)}`,
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
    
    // Detect and validate the code
    const result = detectAndValidateCode(scannedCode);
    console.log('Code detection result:', result);
    
    // Update the appropriate state based on the detected type
    setScannedCodes(prev => {
      const newState = { ...prev, lastScanResult: result };
      
      switch (result.type) {
        case 'SKU':
          newState.sku = result.valid ? result.code : null;
          // Use original code format for display (preserve non-alphanumeric characters)
          newState.skuDisplay = result.valid ? result.originalCode : null;
          break;
        case 'EAN-13':
          newState.ean = result.valid ? result.code : null;
          newState.eanDisplay = result.valid ? (result.displayCode || result.code) : null;
          break;
        case 'UPC':
          newState.upc = result.valid ? result.code : null;
          newState.upcDisplay = result.valid ? (result.displayCode || result.code) : null;
          break;
        case 'ISBN-10':
        case 'ISBN-13':
          newState.isbn = result.valid ? result.code : null;
          newState.isbnDisplay = result.valid ? (result.displayCode || result.code) : null;
          break;
      }
      
      return newState;
    });
  };
  
  /**
   * Check if we have a valid SKU for upload
   */
  const hasValidSku = (): boolean => {
    return !!scannedCodes.sku;
  };

  // Save cropped photo - replace original with cropped version using filename-based cache busting
  const saveCroppedPhoto = async (photoToUpdate: UserPhoto, croppedImageBase64: string): Promise<void> => {
    try {
      // Convert base64 string (from cutting data:image/jpeg;base64,)
      const base64Data = croppedImageBase64.split(',')[1];
      
      // Extract the filename from the filepath
      const oldFilename = extractFilename(photoToUpdate.filepath);
      const oldFilePath = photoToUpdate.filepath;
      
      // Create an MD5 hash from the cropped image data for cache busting
      const md5Hash = generateMD5Hash(base64Data);
      
      // Create a new filename with the hash embedded
      // Pattern: originalname_[hash].jpeg
      const fileNameWithoutExt = oldFilename.substring(0, oldFilename.lastIndexOf('.'));
      const extension = oldFilename.substring(oldFilename.lastIndexOf('.'));
      const newFilename = `${fileNameWithoutExt}_${md5Hash}${extension}`;
      
      console.log(`Saving cropped photo with new filename: ${newFilename} (was: ${oldFilename})`);
      
      // Write the cropped image to disk with the new hashed filename
      const savedFile = await Filesystem.writeFile({
        path: newFilename,
        data: base64Data,
        directory: Directory.Data
      });
      
      // Get the full path to the new file
      let newFilePath: string;
      if (isPlatform('hybrid')) {
        // For hybrid, use the URI from savedFile but remove any trailing slash
        newFilePath = savedFile.uri!;
        if (newFilePath.endsWith('/')) {
          newFilePath = newFilePath.slice(0, -1);
        }
      } else {
        // For web, just use the new filename
        newFilePath = newFilename;
      }
      
      // Generate a new webviewPath for the new file
      let newWebviewPath: string;
      if (isPlatform('hybrid')) {
        newWebviewPath = Capacitor.convertFileSrc(newFilePath);
      } else {
        // For web, use the base64 data directly
        newWebviewPath = croppedImageBase64;
      }
      
      // Handle _original file to maintain naming relationship
      // Find the original file's current name
      const lastDotIdx = oldFilename.lastIndexOf('.');
      const oldOriginalFilename = lastDotIdx !== -1 ?
        oldFilename.substring(0, lastDotIdx) + '_original' + oldFilename.substring(lastDotIdx) :
        oldFilename + '_original';
      
      // Create the new name for the original file with the new hash
      const newOriginalFilename = lastDotIdx !== -1 ?
        newFilename.substring(0, newFilename.lastIndexOf('.')) + '_original' + newFilename.substring(newFilename.lastIndexOf('.')) :
        newFilename + '_original';
        
      // Try to rename the _original file to match the new hashed filename pattern
      try {
        // Check if the old _original file exists
        const result = await Filesystem.stat({
          path: oldOriginalFilename,
          directory: Directory.Data
        });
        
        if (result) {
          // Read the original file
          const originalFileData = await Filesystem.readFile({
            path: oldOriginalFilename,
            directory: Directory.Data
          });
          
          // Write it with the new filename
          await Filesystem.writeFile({
            path: newOriginalFilename,
            data: originalFileData.data as string,
            directory: Directory.Data
          });
          
          console.log(`Renamed _original file from ${oldOriginalFilename} to ${newOriginalFilename}`);
          
          // Delete the old _original file
          await Filesystem.deleteFile({
            path: oldOriginalFilename,
            directory: Directory.Data
          });
        }
      } catch (originalError) {
        // If _original file couldn't be found or processed, log the error
        console.warn(`Could not update _original file: ${oldOriginalFilename} to ${newOriginalFilename}`, originalError);
        // Continue anyway - the main cropping operation should still succeed
      }
      
      // Update the photos array with the new filepath and webviewPath
      const updatedPhotos = photos.map(p => {
        if (p.filepath === photoToUpdate.filepath) {
          return { 
            ...p, 
            filepath: newFilePath,
            webviewPath: newWebviewPath,
            fileName: newFilename // Optional, store filename separately if needed
          };
        }
        return p;
      });
      
      // Update state and storage
      setPhotos(updatedPhotos);
      await Preferences.set({key: PHOTO_STORAGE, value: JSON.stringify(updatedPhotos)});
      
      // Try to delete the old file since we've replaced it
      try {
        // Get just the filename for deletion
        const filenameForDeletion = isPlatform('hybrid') 
          ? extractFilename(oldFilePath)
          : oldFilename;
          
        await Filesystem.deleteFile({
          path: filenameForDeletion,
          directory: Directory.Data
        });
        console.log(`Deleted old image file: ${filenameForDeletion}`);
      } catch (deleteError) {
        // Just log the error, don't throw it since the main operation succeeded
        console.error('Failed to delete old photo file', deleteError);
      }
    } catch (error) {
      console.error('Failed to save cropped photo', error);
      throw error;
    }
  };

  return {
    deletePhoto,
    photos,
    scannedCodes,
    processScannedCode,
    hasValidSku,
    takePhoto,
    pickImages,
    saveCroppedPhoto,
    uploadPhotos,
    isUploading,
    uploadStatus,
    hideUploadStatus,
    clearPhotos,
    loadSaved,
    getOrCreateOriginalForCrop  // Expose the new function
  };
}
