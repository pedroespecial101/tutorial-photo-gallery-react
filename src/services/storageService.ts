import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { isPlatform } from '@ionic/react';
import { UserPhoto } from '../types/photoTypes';
import { extractFilename } from '../utils/fileUtils';

// Constants for storage keys
export const PHOTO_STORAGE = 'photos';
export const APP_VERSION_STORAGE_KEY = 'appVersion';

/**
 * Checks if the app version has changed and resets all data if needed
 * @param currentAppVersion The current app version from package.json
 * @returns Promise with boolean indicating whether a reset occurred
 */
export const checkAppVersionAndReset = async (currentAppVersion: string): Promise<boolean> => {
  try {
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
      
      // Update stored app version to current
      await Preferences.set({ key: APP_VERSION_STORAGE_KEY, value: currentAppVersion });
      
      return true; // Reset occurred
    }
    
    return false; // No reset needed
  } catch (error) {
    console.error('Error checking app version:', error);
    return false;
  }
};

/**
 * Cleans up photo storage by removing orphaned files and fixing inconsistencies
 * @returns Promise with the clean list of photos
 */
export const cleanupPhotosStorage = async (): Promise<UserPhoto[]> => {
  try {
    // Get stored photo metadata from preferences
    const { value } = await Preferences.get({ key: PHOTO_STORAGE });
    const storedPhotos = (value ? JSON.parse(value) : []) as UserPhoto[];
    
    // If no photos are stored, nothing to clean up
    if (storedPhotos.length === 0) {
      console.log('No photos in preferences, nothing to clean up');
      return [];
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
        return [];
      }
      return [];
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
        filename = photo.filepath;
      }
      
      return filename;
    });
    
    // Check for photos in preferences that don't exist in filesystem anymore
    const validPhotos = storedPhotos.filter((photo, index) => {
      const filename = trackedFilenames[index];
      const exists = filesInStorage.includes(filename);
      
      if (!exists) {
        console.log(`Removing photo from preferences that doesn't exist in filesystem: ${filename}`);
      }
      
      return exists;
    });
    
    // Check for _original backup files that don't have main files
    const originalFiles = filesInStorage.filter(name => name.includes('_original'));
    originalFiles.forEach(originalName => {
      const mainName = originalName.replace('_original', '');
      if (!filesInStorage.includes(mainName)) {
        console.log(`Found orphaned _original file without main file: ${originalName}`);
        // Could delete these here if desired
      }
    });
    
    // Update preferences if any photos were removed
    if (validPhotos.length !== storedPhotos.length) {
      console.log(`Cleaning up storage: removed ${storedPhotos.length - validPhotos.length} invalid photos`);
      await Preferences.set({ key: PHOTO_STORAGE, value: JSON.stringify(validPhotos) });
      return validPhotos;
    }
    
    return storedPhotos;
  } catch (error) {
    console.error('Error during photo storage cleanup:', error);
    return [];
  }
};

/**
 * Saves photos list to preferences storage
 * @param photos Array of photos to save
 * @returns Promise<void>
 */
export const savePhotosToPreferences = async (photos: UserPhoto[]): Promise<void> => {
  try {
    await Preferences.set({ key: PHOTO_STORAGE, value: JSON.stringify(photos) });
  } catch (error) {
    console.error('Error saving photos to preferences:', error);
    throw error;
  }
};

/**
 * Clears all photos and associated files
 * @param photos Array of photos to clear
 * @returns Promise<void>
 */
export const clearPhotos = async (photos: UserPhoto[]): Promise<void> => {
  try {
    console.log('Clearing photo session...');
    
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
    
    // Clear preferences
    await Preferences.set({ key: PHOTO_STORAGE, value: JSON.stringify([]) });
    
    console.log('Photos cleared successfully from storage');
  } catch (error) {
    console.error('Error clearing photos:', error);
    throw error;
  }
};

/**
 * Loads saved photos from storage
 * @param currentAppVersion The current app version from package.json
 * @returns Promise with the loaded photos
 */
export const loadSaved = async (currentAppVersion: string): Promise<UserPhoto[]> => {
  try {
    console.log('Starting app initialization');
    
    // Check for new app version first and reset if needed
    const wasReset = await checkAppVersionAndReset(currentAppVersion);
    
    // If a reset occurred, we can skip loading saved photos since we just wiped them
    if (wasReset) {
      console.log('Skipping photo loading after app reset');
      return [];
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
    
    // Cleanup the storage and get the valid photos
    const validPhotos = await cleanupPhotosStorage();
    
    // Return the valid photos
    return validPhotos.length > 0 ? validPhotos : photosInStorage;
  } catch (error) {
    console.error('Error loading saved photos:', error);
    return [];
  }
};
