import { isPlatform } from '@ionic/react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
// Removed Preferences import as it's no longer needed
import { UserPhoto } from '../types/photoTypes';
import { extractFilename, generateMD5Hash } from '../utils/fileUtils';

/**
 * Image Editing Service
 * 
 * Contains functions for manipulating images such as cropping, resizing, etc.
 */

/**
 * Get or create an original copy of an image for cropping
 * This allows preserving the original image while editing
 * @param photoForCrop The photo to get the original version for
 * @returns Promise with the base64 data of the original image
 */
export const getOrCreateOriginalForCrop = async (photoForCrop: UserPhoto): Promise<string> => {
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

/**
 * Save a cropped version of a photo and maintain original backups
 * @param photoToUpdate The photo being updated with a cropped version
 * @param croppedImageBase64 Base64 data of the cropped image
 * @param photos Current array of photos (needed for updating references)
 * @returns Promise with updated photos array
 */
export const saveCroppedPhoto = async (
  photoToUpdate: UserPhoto, 
  croppedImageBase64: string,
  photos: UserPhoto[]
): Promise<{ updatedPhotos: UserPhoto[], oldFilename: string }> => {
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
    
    // Create updated photo object with the new filepath and webviewPath
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
    
    // Return the updated photos array and old filename
    return { updatedPhotos, oldFilename };
  } catch (error) {
    console.error('Failed to save cropped photo', error);
    throw error;
  }
};
