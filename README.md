# Ionic React Multi-Function App

## Overview

This is an Ionic React application that has been repurposed to include three main functionalities:

1. **2D Barcode Scanning**: Scan and display 2D barcodes using the device camera
2. **Photo Capture**: Take photos using the device camera and store them locally
3. **Image Upload**: Upload captured photos to a FastAPI endpoint with a fixed SKU identifier

## Technical Architecture

### Application Structure

The application is built using Ionic React with TypeScript and follows this structure:

```
src/
├── App.tsx                  # Main application component with routing and tab setup
├── components/              # Reusable UI components (currently none in active use)
├── contexts/
│   └── PhotoGalleryContext.tsx  # Context for sharing photo functionality across components
├── hooks/
│   ├── useBarcodeScanner.ts     # Custom hook for barcode scanning functionality
│   └── usePhotoGallery.ts       # Custom hook for camera and photo management
└── pages/
    ├── Tab1.tsx            # Barcode scanning interface
    ├── Tab2.tsx            # Photo gallery and capture interface
    └── Tab3.tsx            # Image upload interface
```

### Key Components and Functionality

#### Tab 1: Barcode Scanning
- Utilizes the Capacitor Barcode Scanner plugin
- Provides a UI to initiate barcode scanning
- Displays the scan results (content and timestamp)
- Implementation is encapsulated in the `useBarcodeScanner` hook

#### Tab 2: Photo Gallery
- Uses Capacitor Camera plugin to capture photos
- Displays photos in a grid layout
- Allows deletion of individual photos
- Stores photos in the device's filesystem
- Handles both web and native platform differences

#### Tab 3: Image Upload
- Lists all available photos captured in Tab 2
- Provides a button to upload photos to a FastAPI endpoint
- Currently uses a fixed SKU ("IOS-Test1") for categorization
- Includes debug information to assist with troubleshooting
- Handles platform-specific file paths and data conversion

### Data Flow

1. **Photo Capture Flow**:
   - User captures photo in Tab 2
   - Photo is saved to filesystem via the `usePhotoGallery` hook
   - Photo reference is stored in state and Preferences
   - Photos are displayed in both Tab 2 and Tab 3

2. **Upload Flow**:
   - User navigates to Tab 3
   - Selects to upload photos
   - Photos are converted to FormData and sent to API endpoint
   - Upload status is displayed to user
   - On successful upload, photo session is cleared

## API Integration

The app connects to a FastAPI endpoint at `https://api.petetreadaway.com/api/image-upload` using a POST request with:

- FormData containing images as blobs
- SKU identifier (currently hardcoded as "IOS-Test1")
- Debug flag set to "true"

## Platform Compatibility

The app handles differences between web and native (iOS/Android) platforms through:
- Platform detection via `isPlatform('hybrid')`
- Different file handling strategies based on platform
- Path conversion for hybrid platforms using `Capacitor.convertFileSrc`

## Implementation Details for LLM Agents

### State Management
- React Context API used for photo gallery state sharing
- Local state hooks used for UI-specific state
- Capacitor Preferences API for persistent storage

### Plugin Integration
- Camera: `@capacitor/camera`
- Filesystem: `@capacitor/filesystem`
- Barcode Scanner: `@capacitor/barcode-scanner`
- Preferences: `@capacitor/preferences`

### Error Handling
- Includes extensive error handling in filesystem operations
- Debug information in Tab 3 helps troubleshoot platform-specific issues
- Toast notifications for user feedback on operations

### Platform-Specific Logic
- The app contains several platform checks and workarounds for different behavior on web vs. iOS/Android
- File path handling is especially important and has specific cleanup logic to prevent issues

## Future Plans
- Convert fixed SKU to a more dynamic process
- Enhance error handling and user feedback
- Improve UI/UX across all tabs
