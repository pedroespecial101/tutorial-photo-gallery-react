import React, { useState, useEffect } from 'react';
import {
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonButton
} from '@ionic/react';
import Cropper from 'react-easy-crop';
import { getAspectRatioFromOption } from '../hooks/useImageAspect';
// We'll use CSS classes for Material Design icons
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
  naturalAspect?: number;
  imageWidth?: number;
  imageHeight?: number;
  onAspectChange: (aspect: number | undefined) => void;
  onCropComplete: (croppedAreaPixels: CropAreaPixels) => void;
  onCopyAndCrop?: () => void;
  onRotationChange?: (rotation: number) => void;
}

/**
 * Reusable image cropper component that encapsulates 
 * the react-easy-crop component and aspect ratio controls
 */
const ImageCropper: React.FC<ImageCropperProps> = ({ 
  image, 
  aspect, 
  naturalAspect,
  imageWidth,
  imageHeight,
  onAspectChange,
  onCropComplete,
  onCopyAndCrop,
  onRotationChange 
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [selectedAspect, setSelectedAspect] = useState<string>('original');
  const [initialState] = useState({
    crop: { x: 0, y: 0 },
    zoom: 1,
    rotation: 0
  });

  /**
   * Handle crop complete event from react-easy-crop
   */
  const handleCropComplete = (_croppedArea: any, croppedAreaPixels: CropAreaPixels) => {
    onCropComplete(croppedAreaPixels);
  };

  /**
   * Handle rotation to the left (counter-clockwise)
   */
  const rotateLeft = () => {
    const newRotation = (rotation - 90) % 360;
    setRotation(newRotation);
    if (onRotationChange) {
      onRotationChange(newRotation);
    }
  };

  /**
   * Handle rotation to the right (clockwise)
   */
  const rotateRight = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    if (onRotationChange) {
      onRotationChange(newRotation);
    }
  };

  /**
   * Reset all cropping parameters to initial state
   */
  const handleReset = () => {
    setCrop(initialState.crop);
    setZoom(initialState.zoom);
    setRotation(initialState.rotation);
    if (onRotationChange) {
      onRotationChange(initialState.rotation);
    }
  };

  /**
   * Handle segment value change for aspect ratio
   */
  const handleSegmentChange = (value: string) => {
    setSelectedAspect(value);
    const newAspect = getAspectRatioFromOption(value, naturalAspect, imageWidth, imageHeight);
    onAspectChange(newAspect);
  };
  
  // Set the correct aspect ratio when the component mounts or when props change
  useEffect(() => {
    const newAspect = getAspectRatioFromOption(selectedAspect, naturalAspect, imageWidth, imageHeight);
    onAspectChange(newAspect);
  }, [naturalAspect, imageWidth, imageHeight]);

  return (
    <>
      <div className="aspect-controls">
        <IonSegment value={selectedAspect} onIonChange={e => handleSegmentChange(e.detail.value as string)}>
          <IonSegmentButton value="original">
            <IonLabel>Original</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="4:3">
            <IonLabel>4:3</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="square">
            <IonLabel>Square</IonLabel>
          </IonSegmentButton>
        </IonSegment>
      </div>
      <div className="cropContainer" style={{ height: '65vh' }}>
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
          aspect={aspect}
          classes={{containerClassName: 'crop-container'}}
        />
        
        <div className="image-controls">
          <IonButton className="control-button reset" onClick={handleReset}>
            <span className="material-icons-outlined">undo</span>
          </IonButton>
          
          <div className="rotation-controls">
            <IonButton className="control-button rotate-left" onClick={rotateLeft}>
              <span className="material-icons-outlined">rotate_90_degrees_ccw</span>
            </IonButton>
            <IonButton className="control-button rotate-right" onClick={rotateRight}>
              <span className="material-icons-outlined">rotate_90_degrees_cw</span>
            </IonButton>
          </div>
        </div>
      </div>
    </>
  );
};

export default ImageCropper;
