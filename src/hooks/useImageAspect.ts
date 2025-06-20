import { useState, useEffect } from 'react';
import { UserPhoto } from '../types/photoTypes';

interface UseImageAspectParams {
  photo: UserPhoto | undefined;
  getOriginalImage: (photo: UserPhoto) => Promise<string>;
}

interface UseImageAspectResult {
  sourceImage: string | null;
  aspect: number | undefined;
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
            // Set the initial aspect ratio based on orientation
            const isLandscape = img.width > img.height;
            if (isLandscape) {
              setAspect(4/3); // Landscape default
            } else {
              setAspect(3/4); // Portrait default
            }
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

  return { sourceImage, aspect, isLoading, setAspect };
}

/**
 * Helper function to handle aspect ratio changes from UI controls
 */
export const handleAspectRatioChange = (value: string, currentAspect: number | undefined, setAspect: (aspect: number | undefined) => void) => {
  switch(value) {
    case 'original':
      // Keep the current aspect which was set based on orientation
      // We don't modify it since it was already set by the hook
      break;
    case 'square':
      setAspect(1); // 1:1 square
      break;
    // Can add more aspect ratios here as needed
  }
};
