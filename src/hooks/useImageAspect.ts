import { useState, useEffect } from 'react';
import { UserPhoto } from '../types/photoTypes';

interface UseImageAspectParams {
  photo: UserPhoto | undefined;
  getOriginalImage: (photo: UserPhoto) => Promise<string>;
}

interface UseImageAspectResult {
  sourceImage: string | null;
  aspect: number | undefined;
  naturalAspect: number | undefined;
  imageWidth: number | undefined;
  imageHeight: number | undefined;
  isLoading: boolean;
  setAspect: (aspect: number | undefined) => void;
}

/**
 * Custom hook for handling image aspect ratio detection and management
 * 
 * This hook handles:
 * 1. Loading the original image for cropping
 * 2. Detecting image orientation (landscape/portrait)
 * 3. Setting appropriate aspect ratio based on orientation
 * 4. Managing loading state
 */
export function useImageAspect({ photo, getOriginalImage }: UseImageAspectParams): UseImageAspectResult {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [naturalAspect, setNaturalAspect] = useState<number | undefined>(undefined);
  const [imageWidth, setImageWidth] = useState<number | undefined>(undefined);
  const [imageHeight, setImageHeight] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load original image for cropping and detect orientation to set aspect ratio
  useEffect(() => {
    const loadOriginalImage = async () => {
      if (photo) {
        try {
          setIsLoading(true);
          // Get or create the original image for cropping
          const originalImagePath = await getOriginalImage(photo);
          setSourceImage(originalImagePath);
          
          // Detect orientation to set aspect ratio
          const img = new Image();
          img.onload = () => {
            // Store image dimensions
            setImageWidth(img.width);
            setImageHeight(img.height);
            
            // Calculate and store natural aspect ratio
            const currentNaturalAspect = img.width / img.height;
            setNaturalAspect(currentNaturalAspect);
            
            // Set the initial aspect ratio to the natural aspect ratio
            setAspect(currentNaturalAspect); // Use natural aspect as default
            
            setIsLoading(false);
          };
          img.onerror = (error) => {
            console.error('Error loading image for orientation detection:', error);
            setIsLoading(false);
          };
          img.src = originalImagePath;
        } catch (error) {
          console.error('Error loading original image for cropping:', error);
          setIsLoading(false);
          // Fallback to using the main image if there's an error
          if (photo?.webviewPath) {
            setSourceImage(photo.webviewPath);
          }
        }
      }
    };
    
    loadOriginalImage();
  }, [photo, getOriginalImage]);

  return { sourceImage, aspect, naturalAspect, imageWidth, imageHeight, isLoading, setAspect };
}

/**
 * Helper function to handle aspect ratio changes from UI controls
 * 
 * This function takes a string aspect ratio option and returns the appropriate numeric aspect ratio
 * based on the image's dimensions.
 */
export const getAspectRatioFromOption = (
  option: string, 
  naturalAspect: number | undefined, 
  imageWidth: number | undefined, 
  imageHeight: number | undefined
): number | undefined => {
  switch(option) {
    case 'original':
      // Use the natural aspect ratio of the image
      return naturalAspect;
    case '4:3':
      // Choose between 4:3 and 3:4 based on image orientation
      if (imageWidth && imageHeight) {
        return imageWidth > imageHeight ? 4/3 : 3/4;
      }
      return undefined;
    case 'square':
      return 1; // 1:1 square
    default:
      return naturalAspect; // Default to natural aspect ratio
  }
};
