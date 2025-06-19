import React, { useState, useEffect } from 'react';
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
  useIonRouter,
  IonSegment,
  IonSegmentButton,
  IonLabel
} from '@ionic/react';
import { useLocation } from 'react-router-dom';
import { usePhotoGalleryContext } from '../contexts/PhotoGalleryContext';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
import { UserPhoto } from '../hooks/usePhotoGallery';
import './Tab4.css'; // Reuse the same styles

interface LocationState {
  photo: UserPhoto;
}

const CropPage: React.FC = () => {
  const location = useLocation<LocationState>();
  const photo = location.state?.photo;
  const { saveCroppedPhoto, getOrCreateOriginalForCrop } = usePhotoGalleryContext();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [sourceImageForCropper, setSourceImageForCropper] = useState<string | null>(null);
  const [isLoadingSource, setIsLoadingSource] = useState<boolean>(true);
  
  // Load original image for cropping and detect orientation to set aspect ratio
  useEffect(() => {
    const loadOriginalImage = async () => {
      if (photo) {
        try {
          setIsLoadingSource(true);
          // Get or create the original image for cropping
          const originalImagePath = await getOrCreateOriginalForCrop(photo);
          setSourceImageForCropper(originalImagePath);
          
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
            setIsLoadingSource(false);
          };
          img.onerror = (error) => {
            console.error('Error loading image for orientation detection:', error);
            setIsLoadingSource(false);
          };
          img.src = originalImagePath;
        } catch (error) {
          console.error('Error loading original image for cropping:', error);
          setIsLoadingSource(false);
          // Fallback to using the main image if there's an error
          if (photo?.webviewPath) {
            setSourceImageForCropper(photo.webviewPath);
          }
        }
      }
    };
    
    loadOriginalImage();
  }, [photo, getOrCreateOriginalForCrop]);
  
  const handleAspectChange = (value: string) => {
    switch(value) {
      case 'original':
        // Keep the current aspect which was set based on orientation
        break;
      case 'square':
        setAspect(1); // 1:1 square
        break;
    }
  };
  const router = useIonRouter();

  const onCropComplete = (_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCrop = async () => {
    if (!photo || !sourceImageForCropper || !croppedAreaPixels) {
      console.error('Missing required data for cropping');
      return;
    }
    
    try {
      setIsCropping(true);
      const croppedImg = await getCroppedImg(
        sourceImageForCropper, // Use the original image source for cropping
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
        {isLoadingSource ? (
          <div className="loading-container" style={{ height: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div>Loading image...</div>
          </div>
        ) : sourceImageForCropper ? (
          <div className="cropContainer" style={{ height: '70vh' }}>
            <Cropper
              image={sourceImageForCropper}
              crop={crop}
              zoom={zoom}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              aspect={aspect}
              classes={{containerClassName: 'crop-container'}}
            />
            <div className="aspect-controls">
              <IonSegment value="original" onIonChange={e => handleAspectChange(e.detail.value as string)}>
                <IonSegmentButton value="original">
                  <IonLabel>Original</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="square">
                  <IonLabel>Square</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </div>
          </div>
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
