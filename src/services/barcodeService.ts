import { ean, upc, isbn } from 'luhn-validation';

export interface BarcodeResult {
  type: 'SKU' | 'EAN-13' | 'UPC' | 'ISBN-10' | 'ISBN-13' | 'UNKNOWN';
  valid: boolean;
  code: string;
  originalCode: string;
}

/**
 * Detects and validates a scanned barcode, determining its type.
 * @param scannedCode The raw scanned code
 * @returns A BarcodeResult object with type, validity, and code information
 */
export function detectAndValidateCode(scannedCode: string): BarcodeResult {
  const code = scannedCode.toString().trim();
  const cleanCode = code.replace(/[^0-9A-Z]/gi, '');
  
  // SKU: Less than 10 characters after cleaning
  if (cleanCode.length < 10) {
    return { type: 'SKU', valid: true, code: cleanCode, originalCode: code };
  }
  
  // ISBN-10: 10 digits, last can be X
  if (cleanCode.length === 10 && /^\d{9}[0-9X]$/i.test(cleanCode)) {
    const isValid = isbn(cleanCode);
    return { 
      type: 'ISBN-10', 
      valid: typeof isValid === 'boolean' ? isValid : false, 
      code: cleanCode, 
      originalCode: code 
    };
  }
  
  // UPC: Exactly 12 digits
  if (cleanCode.length === 12 && /^\d{12}$/.test(cleanCode)) {
    const isValid = upc(cleanCode);
    return { 
      type: 'UPC', 
      valid: typeof isValid === 'boolean' ? isValid : false, 
      code: cleanCode, 
      originalCode: code 
    };
  }
  
  // EAN-13 or ISBN-13: 13 digits
  if (cleanCode.length === 13 && /^\d{13}$/.test(cleanCode)) {
    const isValidEAN = ean(cleanCode);
    // ISBN-13 starts with 978 or 979
    const type = (cleanCode.startsWith('978') || cleanCode.startsWith('979')) ? 'ISBN-13' : 'EAN-13';
    return { 
      type, 
      valid: typeof isValidEAN === 'boolean' ? isValidEAN : false, 
      code: cleanCode, 
      originalCode: code 
    };
  }
  
  // Default: Unknown format
  return { 
    type: 'UNKNOWN', 
    valid: false, 
    code: cleanCode, 
    originalCode: code 
  };
}

/**
 * Helper function to check if a barcode is a valid SKU
 */
export function isValidSku(code: string | null): boolean {
  if (!code) return false;
  const cleanCode = code.replace(/[^0-9A-Z]/gi, '');
  return cleanCode.length < 10;
}
