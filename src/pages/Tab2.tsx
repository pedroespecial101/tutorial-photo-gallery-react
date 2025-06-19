import React, { useEffect } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonFab, IonFabButton, IonIcon, IonGrid, IonRow, IonCol, IonImg, IonButton, useIonViewWillEnter } from '@ionic/react';
import { camera, trash, images } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { usePhotoGalleryContext } from '../contexts/PhotoGalleryContext';
import { UserPhoto } from '../hooks/usePhotoGallery';
import './Tab2.css';

const Tab2: React.FC = () => {
  // Destructure with a function to get the latest photos data
  const { deletePhoto, photos, takePhoto, pickImages, loadSaved } = usePhotoGalleryContext();
  
  // Use Ionic lifecycle hook to refresh photos when view becomes active
  useIonViewWillEnter(() => {
    console.log('Tab2: View will enter, refreshing photos');
    // Reload photos from storage to get the latest data
    loadSaved();
  });
  const history = useHistory();
  
  const handleImageClick = (photo: UserPhoto) => {
    // Navigate to crop page with the photo
    history.push({
      pathname: '/crop',
      state: { photo }
    });
  };
  
  const handleDeleteClick = (event: React.MouseEvent, photo: UserPhoto) => {
    // Stop propagation to prevent triggering the image click
    event.stopPropagation();
    deletePhoto(photo);
  };

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
                <div 
                  className="photo-container"
                  onClick={() => handleImageClick(photo)}
                >
                  <IonImg src={photo.webviewPath} />
                  <IonButton 
                    fill="clear"
                    color="danger" 
                    className="delete-button"
                    onClick={(e) => handleDeleteClick(e, photo)}
                  >
                    <IonIcon icon={trash} />
                  </IonButton>
                </div>
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






      </IonContent>
    </IonPage>
  );
};

export default Tab2;
