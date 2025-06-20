import { BarcodeResult } from '../services/barcodeService';

export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
  fileName?: string;
}

export interface UploadStatus {
  message: string;
  color: 'success' | 'danger' | 'warning';
  show: boolean;
}

export interface ScannedCodes {
  sku: string | null;
  ean: string | null;
  upc: string | null;
  isbn: string | null;
  // Display versions with original formatting
  skuDisplay: string | null;
  eanDisplay: string | null;
  upcDisplay: string | null;
  isbnDisplay: string | null;
  lastScanResult: BarcodeResult | null;
}
