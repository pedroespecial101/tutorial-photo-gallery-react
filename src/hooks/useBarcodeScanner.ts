import { useState, useCallback } from 'react';
import { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint, CapacitorBarcodeScannerCameraDirection, CapacitorBarcodeScannerScanOrientation } from '@capacitor/barcode-scanner';

export interface ScanResult {
  content: string;
  timestamp: number;
}

export function useBarcodeScanner() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  // Start scanning with permission check
  const startScan = async (): Promise<void> => {
    try {
      // Make the scanner element visible (container that will display the camera preview)
      document.body.classList.add('scanner-active');
      
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.ALL,
        scanInstructions: "Please scan a barcode or QR code",
        scanButton: false, // Removed the scan button so scanning starts automatically
        cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
        scanOrientation: CapacitorBarcodeScannerScanOrientation.ADAPTIVE
      });
      
      // Update scan result with content
      if (result.ScanResult) {
        setScanResult({
          content: result.ScanResult,
          timestamp: new Date().getTime()
        });
        setHasPermission(true); // If we got here, we had permission
      }
    } catch (error) {
      console.error('Scanning failed', error);
      // Permission might be denied here, so update state
      setHasPermission(false);
    } finally {
      // Hide the camera preview
      document.body.classList.remove('scanner-active');
    }
  };

  // Clear the scan result after it has been processed
  const clearScanResult = useCallback(() => {
    setScanResult(null);
  }, []);

  return {
    scanResult,
    hasPermission,
    startScan,
    clearScanResult
  };
}
