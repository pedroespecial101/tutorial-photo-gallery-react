import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonBackButton,
  IonFooter,
  useIonRouter
} from '@ionic/react';
import { useLocation } from 'react-router-dom';
import { usePhotoGalleryContext } from '../contexts/PhotoGalleryContext';
import { getCroppedImg } from '../utils/cropImage';
import { UserPhoto } from '../types/photoTypes';
import { useImageAspect } from '../hooks/useImageAspect';
import ImageCropper, { CropAreaPixels } from '../components/ImageCropper';
import './CropPage.css'; // Reuse the same styles

interface LocationState {
  photo: UserPhoto;
}

const CropPage: React.FC = () => {
  const location = useLocation<LocationState>();
  const photo = location.state?.photo;
  const { saveCroppedPhoto, getOrCreateOriginalForCrop } = usePhotoGalleryContext();
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropAreaPixels | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const router = useIonRouter();
  
  // Use the custom hook for image loading and aspect ratio detection
  const { 
    sourceImage, 
    aspect, 
    isLoading, 
    setAspect 
  } = useImageAspect({
    photo, 
    getOriginalImage: getOrCreateOriginalForCrop
  });

  const handleCropComplete = (croppedAreaPixels: CropAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCrop = async () => {
    if (!photo || !sourceImage || !croppedAreaPixels) {
      console.error('Missing required data for cropping');
      return;
    }
    
    try {
      setIsCropping(true);
      const croppedImg = await getCroppedImg(
        sourceImage, // Use the original image source for cropping
        croppedAreaPixels,
        0 // No rotation as requested
      );
      
      // Save the cropped image (will overwrite the main image, not the original)
      await saveCroppedPhoto(photo, croppedImg);
      
      // Go back to gallery
      router.goBack();
    } catch (e) {
      console.error('Error cropping image:', e);
    } finally {
      setIsCropping(false);
    }
  };

  const handleCancel = () => {
    router.goBack();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/tab2" />
          </IonButtons>
          <IonTitle>Crop Image</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {isLoading ? (
          <div className="loading-container" style={{ height: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div>Loading image...</div>
          </div>
        ) : sourceImage ? (
          <ImageCropper
            image={sourceImage}
            aspect={aspect}
            onAspectChange={setAspect}
            onCropComplete={handleCropComplete}
          />
        ) : (
          <div className="error-container" style={{ height: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div>Unable to load image for cropping</div>
          </div>
        )}
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <IonButtons slot="secondary">
            <IonButton onClick={handleCancel}>
              Cancel
            </IonButton>
          </IonButtons>
          <IonButtons slot="primary">
            <IonButton 
              onClick={handleCrop} 
              strong={true} 
              disabled={isCropping || !croppedAreaPixels}
            >
              {isCropping ? 'Processing...' : 'Crop Image'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default CropPage;
