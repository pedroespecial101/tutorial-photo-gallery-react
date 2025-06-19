import React, { useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonFab, IonFabButton, IonIcon, IonGrid, IonRow, IonCol, IonImg, IonActionSheet } from '@ionic/react';
import { camera, trash, close, images } from 'ionicons/icons';
import { usePhotoGalleryContext } from '../contexts/PhotoGalleryContext';
import { UserPhoto } from '../hooks/usePhotoGallery';

const Tab2: React.FC = () => {
  const { deletePhoto, photos, takePhoto, pickImages } = usePhotoGalleryContext();
  const [photoToDelete, setPhotoToDelete] = useState<UserPhoto>();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Photo Gallery</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
      <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Photo Gallery</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonGrid>
          <IonRow>
            {photos.map((photo, index) => (
              <IonCol size="6" key={index}>
                <IonImg onClick={() => setPhotoToDelete(photo)} src={photo.webviewPath} />
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>

        <IonFab vertical="bottom" horizontal="center" slot="fixed">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <IonFabButton 
              onClick={() => pickImages()} 
              style={{ 
                marginRight: '16px',
                '--background': '#61a9fb',  /* Lighter blue color */
                '--background-activated': '#4c96ec'
              }}
              size="small"
            >
              <IonIcon icon={images}></IonIcon>
            </IonFabButton>
            <IonFabButton 
              onClick={() => takePhoto()}
              style={{ 
                width: '72px', /* 2x normal size (default is 36px) */
                height: '72px', /* 2x normal size */
                '--border-radius': '36px'
              }}
            >
              <IonIcon icon={camera} style={{ fontSize: '32px' }}></IonIcon>
            </IonFabButton>
          </div>
        </IonFab>

        <IonActionSheet
          isOpen={!!photoToDelete}
          buttons={[{
            text: 'Delete',
            role: 'destructive',
            icon: trash,
            handler: () => {
              if (photoToDelete) {
                deletePhoto(photoToDelete);
                setPhotoToDelete(undefined);
              }
            }
          }, {
            text: 'Cancel',
            icon: close,
            role: 'cancel'
          }]}
          onDidDismiss={() => setPhotoToDelete(undefined)}
        />


      </IonContent>
    </IonPage>
  );
};

export default Tab2;
