import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonImg, IonButton, IonToast, IonLoading } from '@ionic/react';
import { useState } from 'react';
import { usePhotoGallery } from '../hooks/usePhotoGallery';
import { CapacitorHttp } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { isPlatform } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import './Tab3.css';

const Tab3: React.FC = () => {
  const { photos } = usePhotoGallery();
  const [isUploading, setIsUploading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('');

  const uploadPhotos = async () => {
    if (photos.length === 0) {
      setToastMessage('No photos to upload');
      setToastColor('warning');
      setShowToast(true);
      return;
    }

    setIsUploading(true);
    
    try {
      // Create a FormData object for multipart/form-data
      const formData = new FormData();
      
      // Add the SKU field
      formData.append('sku', 'IOS-Test1');
      
      // Process each photo and add to FormData
      for (const photo of photos) {
        // Get the file data
        let fileName: string;
        let fileData: Blob;
        
        if (isPlatform('hybrid')) {
          // For native platforms (iOS/Android)
          fileName = photo.filepath.substr(photo.filepath.lastIndexOf('/') + 1);
          
          // Read the file from the filesystem
          const fileResult = await Filesystem.readFile({
            path: photo.filepath,
          });
          
          // Convert base64 to Blob
          const base64Data = fileResult.data as string;
          const byteCharacters = atob(base64Data);
          const byteArrays = [];
          
          for (let i = 0; i < byteCharacters.length; i++) {
            byteArrays.push(byteCharacters.charCodeAt(i));
          }
          
          const byteArray = new Uint8Array(byteArrays);
          fileData = new Blob([byteArray], { type: 'image/jpeg' });
        } else {
          // For web, we need to fetch the file from the webPath
          fileName = photo.filepath;
          
          // Fetch the file from the webPath
          const response = await fetch(photo.webviewPath!);
          fileData = await response.blob();
        }
        
        // Add the file to the FormData
        formData.append('images', fileData, fileName);
      }
      
      // Add debug parameter
      formData.append('debug', 'true');
      
      // Make the POST request with FormData
      const response = await CapacitorHttp.post({
        url: 'https://api.petetreadaway.com/api/image_upload/',
        headers: {
          // Don't set Content-Type as it will be automatically set with the boundary
          // for multipart/form-data by the browser/native HTTP client
        },
        data: formData
      });
      
      // Handle response
      if (response.status >= 200 && response.status < 300) {
        setToastMessage('Images uploaded successfully!');
        setToastColor('success');
      } else {
        setToastMessage(`Upload failed: ${response.status} ${response.data?.message || ''}`);
        setToastColor('danger');
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      setToastMessage(`Error uploading images: ${error instanceof Error ? error.message : String(error)}`);
      setToastColor('danger');
    } finally {
      setIsUploading(false);
      setShowToast(true);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Image Upload Test</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Image Upload Test</IonTitle>
          </IonToolbar>
        </IonHeader>
        
        <div className="ion-padding">
          <IonButton 
            expand="block" 
            onClick={uploadPhotos} 
            disabled={photos.length === 0 || isUploading}
          >
            Upload Photos to API
          </IonButton>
          
          <p className="ion-text-center ion-padding">
            {photos.length === 0 ? 
              'No photos available. Take photos in Tab 2 first.' : 
              `${photos.length} photo(s) available for upload`}
          </p>
          
          <IonGrid>
            <IonRow>
              {photos.map((photo, index) => (
                <IonCol size="6" key={index}>
                  <IonImg src={photo.webviewPath} />
                </IonCol>
              ))}
            </IonRow>
          </IonGrid>
        </div>
        
        <IonLoading 
          isOpen={isUploading} 
          message="Uploading images..." 
        />
        
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          color={toastColor}
        />
      </IonContent>
    </IonPage>
  );
};

export default Tab3;
