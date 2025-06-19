import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonRange,
  IonButton,
  IonModal,
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
  IonLabel
} from '@ionic/react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
import './Tab4.css';

const dogImg = 'https://img.huffingtonpost.com/asset/5ab4d4ac2000007d06eb2c56.jpeg?cache=sih0jwle4e&ops=1910_1000';

const Tab4: React.FC = () => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const onCropComplete = (_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const showCroppedImage = async () => {
    try {
      const croppedImg = await getCroppedImg(
        dogImg,
        croppedAreaPixels,
        rotation
      );
      console.log('Image cropped successfully', { croppedImg });
      setCroppedImage(croppedImg);
      setIsModalOpen(true);
    } catch (e) {
      console.error('Error showing cropped image:', e);
    }
  };

  const onClose = () => {
    setIsModalOpen(false);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Image Cropper</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="cropContainer">
          <Cropper
            image={dogImg}
            crop={crop}
            rotation={rotation}
            zoom={zoom}
            aspect={4 / 3}
            onCropChange={setCrop}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>
        
        <div className="controls">
          <IonGrid>
            <IonRow>
              <IonCol>
                <IonItem className="sliderContainer">
                  <IonLabel position="stacked" className="sliderLabel">Zoom</IonLabel>
                  <IonRange
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onIonChange={(e) => setZoom(e.detail.value as number)}
                  />
                </IonItem>
              </IonCol>
            </IonRow>
            <IonRow>
              <IonCol>
                <IonItem className="sliderContainer">
                  <IonLabel position="stacked" className="sliderLabel">Rotation</IonLabel>
                  <IonRange
                    min={0}
                    max={360}
                    step={1}
                    value={rotation}
                    onIonChange={(e) => setRotation(e.detail.value as number)}
                  />
                </IonItem>
              </IonCol>
            </IonRow>
            <IonRow>
              <IonCol>
                <IonButton 
                  expand="block" 
                  onClick={showCroppedImage}
                  className="cropButton"
                >
                  Show Result
                </IonButton>
              </IonCol>
            </IonRow>
          </IonGrid>
        </div>

        {/* Modal to display the cropped image */}
        <IonModal isOpen={isModalOpen} onDidDismiss={onClose}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Cropped Image</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <div className="resultContainer">
              {croppedImage && (
                <img 
                  src={croppedImage} 
                  alt="Cropped" 
                  className="previewImage"
                />
              )}
              <IonButton onClick={onClose} className="ion-margin-top">
                Close
              </IonButton>
            </div>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Tab4;
