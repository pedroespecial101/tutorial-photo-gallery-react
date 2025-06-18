import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonImg, IonButton, IonToast, IonLoading, IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/react';
import { useState, useEffect } from 'react';
import { usePhotoGalleryContext } from '../contexts/PhotoGalleryContext';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { isPlatform } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import './Tab3.css';

const Tab3: React.FC = () => {
  const { photos, uploadPhotos, isUploading, uploadStatus, hideUploadStatus } = usePhotoGalleryContext();
  
  // Debug state variables
  const [debugInfo, setDebugInfo] = useState<{
    platform: string;
    photosCount: number;
    photoDetails: Array<{
      index: number;
      filepath: string;
      hasWebviewPath: boolean;
      webviewPathStartsWith: string;
    }>;
  }>({
    platform: '',
    photosCount: 0,
    photoDetails: []
  });
  
  // Enhanced component load logging
  useEffect(() => {
    // This will run every time the component mounts (which happens when navigating to this tab)
    console.log('===== TAB3 COMPONENT LOADED =====');
    console.log('Current time:', new Date().toISOString());
    console.log('Running on platform:', isPlatform('hybrid') ? 'Hybrid (iOS/Android)' : 'Web');
    
    // Check Filesystem access
    const checkFilesystem = async () => {
      try {
        console.log('Checking filesystem access...');
        const result = await Filesystem.readdir({
          directory: Directory.Data,
          path: ''
        });
        
        console.log(`Filesystem contents (${result.files.length} files):`);
        result.files.forEach((file, index) => {
          console.log(`  ${index + 1}. ${file.name} (${file.type})`);
        });
        
        // Look specifically for jpeg files
        const jpegFiles = result.files.filter(file => file.name.endsWith('.jpeg') || file.name.endsWith('.jpg'));
        console.log(`Found ${jpegFiles.length} JPEG files in storage`);
        
        // Log Capacitor app info
        console.log('Capacitor.convertFileSrc example:');
        if (jpegFiles.length > 0) {
          const testPath = `${Directory.Data}/${jpegFiles[0].name}`;
          console.log(`  Original: ${testPath}`);
          console.log(`  Converted: ${Capacitor.convertFileSrc(testPath)}`);
        }
      } catch (error) {
        console.error('Filesystem check failed:', error);
      }
    };
    
    checkFilesystem();
  }, []); // Empty dependency array ensures this only runs when the component mounts
  
  // Update debug info whenever photos change
  useEffect(() => {
    const platform = isPlatform('hybrid') ? 'Hybrid (iOS/Android)' : 'Web';
    
    const photoDetails = photos.map((photo, index) => ({
      index,
      filepath: photo.filepath,
      hasWebviewPath: !!photo.webviewPath,
      webviewPathStartsWith: photo.webviewPath ? photo.webviewPath.substring(0, 30) + '...' : 'undefined'
    }));
    
    setDebugInfo({
      platform,
      photosCount: photos.length,
      photoDetails
    });
    
    console.log('===== TAB3 PHOTOS STATE UPDATED =====');
    console.log({
      platform,
      photosCount: photos.length,
      photos: photos.map(p => ({
        filepath: p.filepath, 
        hasWebviewPath: !!p.webviewPath,
        webviewPath: p.webviewPath
      }))
    });
  }, [photos]);

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
            onClick={() => uploadPhotos()} 
            disabled={photos.length === 0 || isUploading}
          >
            Upload Photos to API
          </IonButton>
          
          <p className="ion-text-center ion-padding">
            {photos.length === 0 ? 
              'No photos available. Take photos in Tab 2 first.' : 
              `${photos.length} photo(s) available for upload`}
          </p>
          
          {/* Debug Information Card */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Debug Information</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p><strong>Platform:</strong> {debugInfo.platform}</p>
              <p><strong>Photos Count:</strong> {debugInfo.photosCount}</p>
              
              {debugInfo.photoDetails.length > 0 && (
                <div>
                  <p><strong>Photo Details:</strong></p>
                  {debugInfo.photoDetails.map((detail) => (
                    <div key={detail.index} style={{marginBottom: '10px', borderBottom: '1px solid #ccc', paddingBottom: '5px'}}>
                      <p>Photo #{detail.index + 1}</p>
                      <p>Filepath: {detail.filepath}</p>
                      <p>Has webviewPath: {detail.hasWebviewPath ? 'Yes' : 'No'}</p>
                      <p>webviewPath starts with: {detail.webviewPathStartsWith}</p>
                    </div>
                  ))}
                </div>
              )}
            </IonCardContent>
          </IonCard>
          
          <IonGrid>
            <IonRow>
              {photos.map((photo, index) => (
                <IonCol size="6" key={index}>
                  <p>Photo #{index + 1}</p>
                  {photo.webviewPath ? 
                    <IonImg src={photo.webviewPath} /> :
                    <div style={{background: '#f0f0f0', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      No image path
                    </div>
                  }
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
          isOpen={uploadStatus.show}
          onDidDismiss={hideUploadStatus}
          message={uploadStatus.message}
          duration={3000}
          color={uploadStatus.color}
        />
      </IonContent>
    </IonPage>
  );
};

export default Tab3;
