import { useState, useEffect } from "react";
import { isPlatform } from '@ionic/react';

import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const PHOTO_STORAGE = 'photos';

export function usePhotoGallery() {

  const [photos, setPhotos] = useState<UserPhoto[]>([]);

  useEffect(() => {
    const loadSaved = async () => {
      await cleanupPhotosStorage();
      const { value } = await Preferences.get({key: PHOTO_STORAGE });

      const photosInPreferences = (value ? JSON.parse(value) : []) as UserPhoto[];
      // If running on the web...
      if (!isPlatform('hybrid')) {
        for (let photo of photosInPreferences) {
          const file = await Filesystem.readFile({
            path: photo.filepath,
            directory: Directory.Data
          });
          // Web platform only: Load the photo as base64 data
          photo.webviewPath = `data:image/jpeg;base64,${file.data}`;
        }
      }
      setPhotos(photosInPreferences);
    };
    loadSaved();
  }, []);

  const takePhoto = async () => {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      width: 2000,
      height: 2000,
      quality: 90,
      // presentationStyle: 'popover'
      // allowEditing: true
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
      return {
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri),
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

    // delete photo file from filesystem
    const filename = photo.filepath.substr(photo.filepath.lastIndexOf('/') + 1);
    await Filesystem.deleteFile({
      path: filename,
      directory: Directory.Data
    });
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
        // Extract filename from filepath
        const filename = photo.filepath.substr(photo.filepath.lastIndexOf('/') + 1);
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
        const filename = photo.filepath.substr(photo.filepath.lastIndexOf('/') + 1);
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

  return {
    deletePhoto,
    photos,
    takePhoto,
    cleanupPhotosStorage  // Export the function in case it needs to be called manually
  };
}

export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
}

export async function base64FromPath(path: string): Promise<string> {
  const response = await fetch(path);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject('method did not return a string')
      }
    };
    reader.readAsDataURL(blob);
  });
}
