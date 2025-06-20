import { UserPhoto, ScannedCodes } from '../types/photoTypes';

/**
 * Response object returned from the upload photos operation
 */
export interface UploadResponse {
  success: boolean;
  message: string;
  status?: number;
  body?: string;
}

/**
 * Uploads photos to the server with associated barcode data
 * @param photos Array of photos to upload
 * @param scannedCodes Barcode data to associate with the photos
 * @returns Promise with upload response result
 */
export const uploadPhotos = async (
  photos: UserPhoto[], 
  scannedCodes: ScannedCodes
): Promise<UploadResponse> => {
  if (photos.length === 0) {
    return {
      success: false,
      message: 'No photos to upload'
    };
  }

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
      return {
        success: true,
        message: 'Images uploaded successfully! Starting new session...'
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        message: `Upload failed: ${response.status} ${errorText}`,
        status: response.status,
        body: errorText
      };
    }
    
  } catch (error) {
    console.error('Error uploading images:', error);
    return {
      success: false,
      message: `Error uploading images: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};
