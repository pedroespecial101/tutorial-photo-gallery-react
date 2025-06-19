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
  const { saveCroppedPhoto } = usePhotoGalleryContext();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  
  // Detect image orientation and set initial aspect ratio
  useEffect(() => {
    if (photo?.webviewPath) {
      const img = new Image();
      img.onload = () => {
        // Set the initial aspect ratio based on orientation
        const isLandscape = img.width > img.height;
        if (isLandscape) {
          setAspect(4/3); // Landscape default
        } else {
          setAspect(3/4); // Portrait default
        }
      };
      img.src = photo.webviewPath;
    }
  }, [photo]);
  
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
    if (!photo || !photo.webviewPath || !croppedAreaPixels) {
      console.error('Missing required data for cropping');
      return;
    }
    
    try {
      setIsCropping(true);
      const croppedImg = await getCroppedImg(
        photo.webviewPath,
        croppedAreaPixels,
        0 // No rotation as requested
      );
      
      // Save the cropped image
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
        {photo?.webviewPath && (
          <div className="cropContainer" style={{ height: '70vh' }}>
            <Cropper
              image={photo?.webviewPath}
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
