import { useState } from 'react';
import { processScannedCode as processCode, hasValidSku as checkValidSku } from '../services/barcodeService';
import { ScannedCodes } from '../types/photoTypes';

export function useScannedCodes() {
  const [scannedCodes, setScannedCodes] = useState<ScannedCodes>({
    sku: null,
    ean: null,
    upc: null,
    isbn: null,
    skuDisplay: null,
    eanDisplay: null,
    upcDisplay: null,
    isbnDisplay: null,
    lastScanResult: null
  });

  /**
   * Processes a scanned code, detects its type, and updates the appropriate state
   */
  const processScannedCode = (scannedCode: string) => {
    if (!scannedCode) return;
    
    // Use the barcode service to process the code and get the updated state
    const updatedScannedCodes = processCode(scannedCode, scannedCodes);
    
    // Update state with the result
    setScannedCodes(updatedScannedCodes);
  };
  
  /**
   * Check if we have a valid SKU for upload
   */
  const hasValidSku = (): boolean => {
    return checkValidSku(scannedCodes);
  };

  const resetScannedCodes = () => {
    setScannedCodes({
      sku: null,
      ean: null,
      upc: null,
      isbn: null,
      skuDisplay: null,
      eanDisplay: null,
      upcDisplay: null,
      isbnDisplay: null,
      lastScanResult: null
    });
  };

  return {
    scannedCodes,
    processScannedCode,
    hasValidSku,
    resetScannedCodes
  };
}
