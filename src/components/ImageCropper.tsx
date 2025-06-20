import React from 'react';
import {
  IonSegment,
  IonSegmentButton,
  IonLabel
} from '@ionic/react';
import Cropper from 'react-easy-crop';
import { handleAspectRatioChange } from '../hooks/useImageAspect';
import '../pages/Tab4.css'; // Reuse the same styles

export interface CropAreaPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropperProps {
  image: string;
  aspect?: number;
  onAspectChange: (aspect: number | undefined) => void;
  onCropComplete: (croppedAreaPixels: CropAreaPixels) => void;
}

/**
 * Reusable image cropper component that encapsulates 
 * the react-easy-crop component and aspect ratio controls
 */
const ImageCropper: React.FC<ImageCropperProps> = ({ 
  image, 
  aspect, 
  onAspectChange,
  onCropComplete 
}) => {
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);

  /**
   * Handle crop complete event from react-easy-crop
   */
  const handleCropComplete = (_croppedArea: any, croppedAreaPixels: CropAreaPixels) => {
    onCropComplete(croppedAreaPixels);
  };

  /**
   * Handle segment value change for aspect ratio
   */
  const handleSegmentChange = (value: string) => {
    handleAspectRatioChange(value, aspect, onAspectChange);
  };

  return (
    <>
      <div className="cropContainer" style={{ height: '70vh' }}>
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
          aspect={aspect}
          classes={{containerClassName: 'crop-container'}}
        />
      </div>
      <div className="aspect-controls">
        <IonSegment value="original" onIonChange={e => handleSegmentChange(e.detail.value as string)}>
          <IonSegmentButton value="original">
            <IonLabel>Original</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="square">
            <IonLabel>Square</IonLabel>
          </IonSegmentButton>
        </IonSegment>
      </div>
    </>
  );
};

export default ImageCropper;
