import React, { createContext, useContext, ReactNode } from 'react';
import { usePhotoGallery, UserPhoto, UploadStatus, ScannedCodes } from '../hooks/usePhotoGallery';

interface PhotoGalleryContextType {
  photos: UserPhoto[];
  scannedCodes: ScannedCodes;
  processScannedCode: (scannedCode: string) => void;
  hasValidSku: () => boolean;
  takePhoto: () => Promise<void>;
  pickImages: () => Promise<void>;
  deletePhoto: (photo: UserPhoto) => Promise<void>;
  saveCroppedPhoto: (originalPhoto: UserPhoto, croppedImageBase64: string) => Promise<void>;
  uploadPhotos: () => Promise<void>;
  clearPhotos: () => Promise<void>;
  isUploading: boolean;
  uploadStatus: UploadStatus;
  hideUploadStatus: () => void;
}

const PhotoGalleryContext = createContext<PhotoGalleryContextType | undefined>(undefined);

interface PhotoGalleryProviderProps {
  children: ReactNode;
}

export const PhotoGalleryProvider: React.FC<PhotoGalleryProviderProps> = ({ children }) => {
  const photoGalleryData = usePhotoGallery();

  return (
    <PhotoGalleryContext.Provider value={photoGalleryData}>
      {children}
    </PhotoGalleryContext.Provider>
  );
};

export const usePhotoGalleryContext = (): PhotoGalleryContextType => {
  const context = useContext(PhotoGalleryContext);
  if (context === undefined) {
    throw new Error('usePhotoGalleryContext must be used within a PhotoGalleryProvider');
  }
  return context;
};
