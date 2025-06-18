import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonImg, IonButton, IonToast, IonLoading, IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/react';
import { useState, useEffect } from 'react';
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

  const uploadPhotos = async () => {
    if (photos.length === 0) {
      setToastMessage('No photos to upload');
      setToastColor('warning');
      setShowToast(true);
      return;
    }

    setIsUploading(true);
    
    try {
      console.log('Starting photo upload process...');
      
      if (isPlatform('hybrid')) {
        console.log('Using native upload approach for hybrid platform');
        // For native platforms (iOS/Android), we need to handle uploads differently
        // We can't use FormData with Blobs as they don't serialize across the bridge
        
        // Create form parts manually for native platforms
        const formDataParts: any[] = [
          // Add the SKU field
          {
            name: 'sku',
            value: 'IOS-Test1'
          },
          // Add debug parameter
          {
            name: 'debug',
            value: 'true'
          }
        ];
        
        // Process each photo
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          
          console.log(`Processing photo ${i + 1}/${photos.length}: ${photo.filepath}`);
          
          // Extract filename from filepath
          const fileName = photo.filepath.substr(photo.filepath.lastIndexOf('/') + 1);
          
          try {
            // Read the file as base64
            const fileResult = await Filesystem.readFile({
              path: photo.filepath
            });
            
            // Add file to form parts
            formDataParts.push({
              name: 'images',
              value: fileResult.data,
              type: 'image/jpeg',
              filename: fileName
            });
            
            console.log(`Added photo ${fileName} to upload`);
          } catch (error) {
            console.error(`Error reading file ${fileName}:`, error);
            throw new Error(`Failed to read file ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        
        console.log('Sending native HTTP request with', formDataParts.length, 'parts');
        
        // Make the POST request with native-compatible form data
        const response = await CapacitorHttp.post({
          url: 'https://api.petetreadaway.com/api/image-upload/',
          headers: {
            'Accept': 'application/json',
            // Don't set Content-Type as it will be automatically set with the boundary
          },
          data: formDataParts,
          // Tell the plugin this is a multipart form data request
          dataType: 'multipart'
        });
        
        console.log('Upload response received:', response);
        
        // Handle response
        if (response.status >= 200 && response.status < 300) {
          setToastMessage('Images uploaded successfully!');
          setToastColor('success');
        } else {
          setToastMessage(`Upload failed: ${response.status} ${response.data?.message || ''}`);
          setToastColor('danger');
        }
      } else {
        console.log('Using standard web upload approach');
        // For web platform, use standard FormData approach
        // Create a FormData object for multipart/form-data
        const formData = new FormData();
        
        // Add the SKU field
        formData.append('sku', 'IOS-Test1');
        
        // Process each photo and add to FormData
        for (const photo of photos) {
          // Get the file data
          let fileName = photo.filepath;
          
          // Fetch the file from the webPath
          const response = await fetch(photo.webviewPath!);
          const fileData = await response.blob();
          
          // Add the file to the FormData
          formData.append('images', fileData, fileName);
        }
        
        // Add debug parameter
        formData.append('debug', 'true');
        
        console.log('Sending web request with FormData');
        
        // Make the POST request with FormData
        const response = await CapacitorHttp.post({
          url: 'https://api.petetreadaway.com/api/image-upload/',
          headers: {},
          data: formData
        });
        
        console.log('Upload response received:', response);
        
        // Handle response
        if (response.status >= 200 && response.status < 300) {
          setToastMessage('Images uploaded successfully!');
          setToastColor('success');
        } else {
          setToastMessage(`Upload failed: ${response.status} ${response.data?.message || ''}`);
          setToastColor('danger');
        }
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
