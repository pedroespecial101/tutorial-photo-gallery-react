import { isPlatform } from '@ionic/react';
import { Camera, CameraResultType, CameraSource, Photo, GalleryPhoto } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { UserPhoto } from '../types/photoTypes';
import { extractFilename, getWebviewPathForFile, generateMD5Hash, base64FromPath } from '../utils/fileUtils';
import { Preferences } from '@capacitor/preferences';

/**
 * Photo Service
 * Handles all photo-related operations like taking photos, picking from gallery,
 * saving pictures, deleting photos, and cropping operations.
 */

/**
 * Saves a photo from the camera or gallery to the filesystem
 * @param photo Photo object from Camera/Capacitor
 * @param fileName Filename to save the photo as
 * @returns UserPhoto object with file path and webview path
 */
/**
 * Takes a new photo using the device camera
 * @returns A promise that resolves with the new photo
 */
export const takePhoto = async (): Promise<Photo> => {
  return await Camera.getPhoto({
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
    quality: 100
  });
};

/**
 * Pick multiple images from the device gallery
 * @returns A promise that resolves with the gallery photos
 */
export const pickImages = async () => {
  return await Camera.pickImages({
    quality: 90,
    limit: 10
  });
};

/**
 * Delete a photo from the filesystem
 * @param photo UserPhoto to delete
 * @returns Promise<void>
 */
export const deletePhoto = async (photo: UserPhoto): Promise<void> => {
  try {
    // Extract the correct filename using the extractFilename utility
    const filename = extractFilename(photo.filepath);
    console.log(`Deleting file: ${filename} from path: ${photo.filepath}`);
    
    // Delete photo file from filesystem
    await Filesystem.deleteFile({
      path: filename,
      directory: Directory.Data
    });
  } catch (error) {
    console.error('Failed to delete photo', error);
    throw error;
  }
};

export const savePicture = async (photo: Photo, fileName: string): Promise<UserPhoto> => {
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
      // Create the original filename by inserting '_original' before the extension
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
