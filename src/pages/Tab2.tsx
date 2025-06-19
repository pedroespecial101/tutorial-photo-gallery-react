import React, { useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonFab, IonFabButton, IonIcon, IonGrid, IonRow, IonCol, IonImg, IonActionSheet, IonFabList } from '@ionic/react';
import { camera, trash, close, images } from 'ionicons/icons';
import { usePhotoGalleryContext } from '../contexts/PhotoGalleryContext';
import { UserPhoto } from '../hooks/usePhotoGallery';
import './Tab2.css';

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

        {/* Gallery button - positioned to the left */}
        <IonFab vertical="bottom" horizontal="start" slot="fixed" className="gallery-fab">
          <IonFabButton 
            onClick={() => pickImages()} 
            color="secondary"
            className="large-fab-button"
          >
            <IonIcon icon={images} />
          </IonFabButton>
        </IonFab>

        {/* Camera button - positioned to the right */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed" className="camera-fab">
          <IonFabButton 
            onClick={() => takePhoto()}
            color="primary"
            className="large-fab-button"
          >
            <IonIcon icon={camera} />
          </IonFabButton>
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
