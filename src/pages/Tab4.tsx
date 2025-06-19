import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonModal,
  IonGrid,
  IonRow,
  IonCol
} from '@ionic/react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
import './Tab4.css';

const dogImg = 'https://img.huffingtonpost.com/asset/5ab4d4ac2000007d06eb2c56.jpeg?cache=sih0jwle4e&ops=1910_1000';

const Tab4: React.FC = () => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
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
        0 // No rotation
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
            zoom={zoom}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            aspect={4 / 3}
            classes={{ containerClassName: 'crop-container' }}
          />
        </div>
        
        <div className="controls">
          <IonGrid>
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
