import React, { useEffect } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent, IonText, IonFab, IonFabButton, IonBadge, IonChip, IonLabel, IonList, IonItem, IonItemDivider } from '@ionic/react';
import { scanOutline, checkmarkCircleOutline, alertCircleOutline, barcodeOutline, documentOutline, bookOutline, basketOutline } from 'ionicons/icons';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { usePhotoGalleryContext } from '../contexts/PhotoGalleryContext';
import './Tab1.css';

const Tab1: React.FC = () => {
  const { scanResult, startScan } = useBarcodeScanner();
  const { processScannedCode, scannedCodes, hasValidSku } = usePhotoGalleryContext();
  
  // When a barcode is scanned, process it to detect its type
  useEffect(() => {
    if (scanResult) {
      processScannedCode(scanResult.content);
      console.log('Barcode scanned and processed:', scanResult.content);
    }
  }, [scanResult, processScannedCode]);

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
        
        {/* Current Scanned Codes Status */}
        <IonCard className="ion-margin-bottom">
          <IonCardHeader>
            <IonCardSubtitle>Current Session</IonCardSubtitle>
            <IonCardTitle>Identified Codes</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList>
              {/* SKU */}
              <IonItem lines="full">
                <IonIcon slot="start" icon={barcodeOutline} color="primary" />
                <IonLabel>SKU</IonLabel>
                {scannedCodes.sku ? (
                  <IonChip slot="end" color="success">
                    <IonIcon icon={checkmarkCircleOutline} />
                    <IonLabel>{scannedCodes.skuDisplay || scannedCodes.sku}</IonLabel>
                  </IonChip>
                ) : (
                  <IonText color="medium" slot="end">Not scanned</IonText>
                )}
              </IonItem>

              {/* EAN */}
              <IonItem lines="full">
                <IonIcon slot="start" icon={basketOutline} color="tertiary" />
                <IonLabel>EAN-13</IonLabel>
                {scannedCodes.ean ? (
                  <IonChip slot="end" color="success">
                    <IonIcon icon={checkmarkCircleOutline} />
                    <IonLabel>{scannedCodes.eanDisplay || scannedCodes.ean}</IonLabel>
                  </IonChip>
                ) : (
                  <IonText color="medium" slot="end">Not scanned</IonText>
                )}
              </IonItem>

              {/* UPC */}
              <IonItem lines="full">
                <IonIcon slot="start" icon={basketOutline} color="secondary" />
                <IonLabel>UPC</IonLabel>
                {scannedCodes.upc ? (
                  <IonChip slot="end" color="success">
                    <IonIcon icon={checkmarkCircleOutline} />
                    <IonLabel>{scannedCodes.upcDisplay || scannedCodes.upc}</IonLabel>
                  </IonChip>
                ) : (
                  <IonText color="medium" slot="end">Not scanned</IonText>
                )}
              </IonItem>

              {/* ISBN */}
              <IonItem lines="full">
                <IonIcon slot="start" icon={bookOutline} color="dark" />
                <IonLabel>ISBN</IonLabel>
                {scannedCodes.isbn ? (
                  <IonChip slot="end" color="success">
                    <IonIcon icon={checkmarkCircleOutline} />
                    <IonLabel>{scannedCodes.isbnDisplay || scannedCodes.isbn}</IonLabel>
                  </IonChip>
                ) : (
                  <IonText color="medium" slot="end">Not scanned</IonText>
                )}
              </IonItem>
            </IonList>

            {/* Upload status indicator */}
            <div className="ion-padding-top ion-text-center">
              {hasValidSku() ? (
                <IonText color="success">
                  <p><IonIcon icon={checkmarkCircleOutline} /> Ready for upload</p>
                </IonText>
              ) : (
                <IonText color="warning">
                  <p><IonIcon icon={alertCircleOutline} /> Need valid SKU for upload</p>
                </IonText>
              )}
            </div>
          </IonCardContent>
        </IonCard>

        {/* Latest Scan Result */}
        {scanResult ? (
          <IonCard>
            <IonCardHeader>
              <IonCardSubtitle>Last Scan Result</IonCardSubtitle>
              <IonCardTitle>
                {scannedCodes.lastScanResult?.type || 'Barcode'}
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonText>
                <p>{scanResult.content}</p>
              </IonText>
              <IonText color="medium">
                <p>Scanned at: {new Date(scanResult.timestamp).toLocaleString()}</p>
              </IonText>
              
              {scannedCodes.lastScanResult && (
                <IonChip color={scannedCodes.lastScanResult.valid ? "success" : "danger"}>
                  <IonIcon icon={scannedCodes.lastScanResult.valid ? checkmarkCircleOutline : alertCircleOutline} />
                  <IonLabel>{scannedCodes.lastScanResult.valid ? 'Valid' : 'Invalid'} {scannedCodes.lastScanResult.type}</IonLabel>
                </IonChip>
              )}
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
