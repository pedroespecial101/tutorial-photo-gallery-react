import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent, IonText, IonFab, IonFabButton } from '@ionic/react';
import { scanOutline } from 'ionicons/icons';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import './Tab1.css';

const Tab1: React.FC = () => {
  const { scanResult, startScan } = useBarcodeScanner();

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
