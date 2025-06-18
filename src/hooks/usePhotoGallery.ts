import { useState, useEffect } from 'react';
import { isPlatform } from '@ionic/react';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory, FilesystemEncoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
}

const PHOTO_STORAGE = 'photos';

export function usePhotoGallery() {
  const [photos, setPhotos] = useState<UserPhoto[]>([]);

  const loadSaved = async () => {
    await cleanupPhotosStorage();
    const { value } = await Preferences.get({key: PHOTO_STORAGE });

    const photosInPreferences = (value ? JSON.parse(value) : []) as UserPhoto[];
    
    // Process photos based on platform
    for (let photo of photosInPreferences) {
      if (!isPlatform('hybrid')) {
        // Web platform: Load the photo as base64 data
        const file = await Filesystem.readFile({
          path: photo.filepath,
          directory: Directory.Data
        });
        photo.webviewPath = `data:image/jpeg;base64,${file.data}`;
      } else {
        // Hybrid platform (iOS/Android): Convert file path to HTTP
        // This ensures photos are still viewable after app restart
        photo.webviewPath = Capacitor.convertFileSrc(photo.filepath);
      }
    }
    
    setPhotos(photosInPreferences);
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
    const savedFile = await Filesystem.writeFile({
      path: fileName,
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
      
      return {
        filepath: filepath,
        webviewPath: Capacitor.convertFileSrc(filepath),
      };
    }
    else {
      // Use webPath to display the new image instead of base64 since it's
      // already loaded into memory
      return {
        filepath: fileName,
        webviewPath: photo.webPath
      };
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

  // New function to clean up photo storage on startup
  const cleanupPhotosStorage = async () => {
    try {
      // Get stored photo metadata from preferences
      const { value } = await Preferences.get({ key: PHOTO_STORAGE });
      const storedPhotos = (value ? JSON.parse(value) : []) as UserPhoto[];
      
      // Get actual files from filesystem
      let filesInStorage: string[] = [];
      try {
        const result = await Filesystem.readdir({
          directory: Directory.Data,
          path: ''
        });
        filesInStorage = result.files.map(file => file.name).filter(name => name.endsWith('.jpeg'));
      } catch (e) {
        // Directory might not exist yet, which is fine for first run
        console.log('No photo directory found, nothing to clean up');
        return;
      }

      // Find orphaned files (files that exist in the filesystem but not in preferences)
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

      // Delete orphaned files
      for (const filename of filesInStorage) {
        if (!trackedFilenames.includes(filename)) {
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
        
        return filesInStorage.includes(filename);
      });

      // Update preferences with clean list
      if (validPhotos.length !== storedPhotos.length) {
        console.log(`Cleaned up ${storedPhotos.length - validPhotos.length} phantom image entries`);
        await Preferences.set({ key: PHOTO_STORAGE, value: JSON.stringify(validPhotos) });
        setPhotos(validPhotos);
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

  return {
    photos,
    takePhoto,
    deletePhoto
  };
}
