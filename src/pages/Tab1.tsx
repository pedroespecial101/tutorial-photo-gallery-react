import React, { useEffect } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent, IonText, IonFab, IonFabButton, IonBadge, IonChip, IonLabel } from '@ionic/react';
import { scanOutline, checkmarkCircleOutline, alertCircleOutline } from 'ionicons/icons';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { usePhotoGalleryContext } from '../contexts/PhotoGalleryContext';
import './Tab1.css';

const Tab1: React.FC = () => {
  const { scanResult, startScan } = useBarcodeScanner();
  const { setScannedSku, scannedSku, validateSkuFormat } = usePhotoGalleryContext();
  
  // When a barcode is scanned, update the shared state
  useEffect(() => {
    if (scanResult) {
      setScannedSku(scanResult.content);
      console.log('Barcode scanned and saved to shared state:', scanResult.content);
    }
  }, [scanResult, setScannedSku]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Barcode Scanner</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Barcode Scanner</IonTitle>
          </IonToolbar>
        </IonHeader>
        
        {/* Current Stored SKU Status */}
        <IonCard className="ion-margin-bottom">
          <IonCardHeader>
            <IonCardSubtitle>Current SKU Status</IonCardSubtitle>
            <IonCardTitle>Storage</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {scannedSku ? (
              <div>
                <IonChip color={validateSkuFormat(scannedSku) ? "success" : "warning"}>
                  <IonIcon icon={validateSkuFormat(scannedSku) ? checkmarkCircleOutline : alertCircleOutline} />
                  <IonLabel>{scannedSku}</IonLabel>
                </IonChip>
                {!validateSkuFormat(scannedSku) && (
                  <IonText color="warning">
                    <p>Note: This SKU is not valid for upload (must be less than 10 characters).</p>
                  </IonText>
                )}
              </div>
            ) : (
              <IonText color="medium">
                <p>No SKU stored. Scan a barcode first.</p>
              </IonText>
            )}
          </IonCardContent>
        </IonCard>

        {/* Latest Scan Result */}
        {scanResult ? (
          <IonCard>
            <IonCardHeader>
              <IonCardSubtitle>Scan Result</IonCardSubtitle>
              <IonCardTitle>Barcode Content</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonText>
                <p>{scanResult.content}</p>
              </IonText>
              <IonText color="medium">
                <p>Scanned at: {new Date(scanResult.timestamp).toLocaleString()}</p>
              </IonText>
            </IonCardContent>
          </IonCard>
        ) : (
          <div className="ion-text-center ion-padding">
            <p>Press the button below to start scanning a barcode.</p>
          </div>
        )}
        
        <IonFab vertical="bottom" horizontal="center" slot="fixed">
          <IonFabButton onClick={() => startScan()}>
            <IonIcon icon={scanOutline}></IonIcon>
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
