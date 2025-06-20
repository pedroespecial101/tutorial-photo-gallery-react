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
  IonIcon,
  useIonRouter
} from '@ionic/react';
import { cropOutline, copyOutline } from 'ionicons/icons';
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
  const [rotation, setRotation] = useState(0);
  const router = useIonRouter();
  
  // Use the custom hook for image loading and aspect ratio detection
  const { 
    sourceImage, 
    aspect, 
    naturalAspect,
    imageWidth,
    imageHeight,
    isLoading, 
    setAspect 
  } = useImageAspect({
    photo, 
    getOriginalImage: getOrCreateOriginalForCrop
  });

  const handleCropComplete = (croppedAreaPixels: CropAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };
  
  // Track rotation value from ImageCropper component
  const handleRotationChange = (newRotation: number) => {
    setRotation(newRotation);
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
        rotation // Apply the rotation value 
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

  // Placeholder for Copy & Crop functionality
  const handleCopyAndCrop = async () => {
    if (!photo || !sourceImage || !croppedAreaPixels) {
      console.error('Missing required data for copy & crop');
      return;
    }
    
    try {
      setIsCropping(true);
      const croppedImg = await getCroppedImg(
        sourceImage,
        croppedAreaPixels,
        rotation
      );
      
      // TODO: Implement copy functionality here
      console.log('Copy & Crop not yet implemented');
      // For now, just do a regular crop
      await saveCroppedPhoto(photo, croppedImg);
      
      router.goBack();
    } catch (e) {
      console.error('Error in copy & crop:', e);
    } finally {
      setIsCropping(false);
    }
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
            naturalAspect={naturalAspect}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            onAspectChange={setAspect}
            onCropComplete={handleCropComplete}
            onCopyAndCrop={handleCopyAndCrop}
            onRotationChange={handleRotationChange}
          />
        ) : (
          <div className="error-container" style={{ height: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div>Unable to load image for cropping</div>
          </div>
        )}
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <div className="footer-buttons-container">
            <IonButton 
              className="cancel-btn" 
              fill="outline" 
              onClick={handleCancel}
              disabled={isCropping}
            >
              Cancel
            </IonButton>
            
            <IonButton 
              className="copy-crop-btn" 
              onClick={handleCopyAndCrop}
              disabled={isCropping || !croppedAreaPixels}
            >
              <IonIcon icon={copyOutline} />
              <span style={{ marginLeft: '5px' }}>Copy & Crop</span>
            </IonButton>

            <IonButton 
              className="crop-btn" 
              onClick={handleCrop} 
              strong={true} 
              disabled={isCropping || !croppedAreaPixels}
            >
              {isCropping ? 'Processing...' : (
                <>
                  <IonIcon icon={cropOutline} /> 
                  <span style={{ marginLeft: '5px' }}>Crop</span>
                </>
              )}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default CropPage;
