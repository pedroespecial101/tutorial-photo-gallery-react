import { ean, upc, isbn } from 'luhn-validation';

export interface BarcodeResult {
  type: string;
  valid: boolean;
  code: string;       // Cleaned version for validation
  originalCode: string; // Original scanned code for display
  displayCode?: string; // Optional formatted version for display
}

/**
 * Detects and validates a scanned barcode, determining its type.
 * @param scannedCode The raw scanned code
 * @returns A BarcodeResult object with type, validity, and code information
 */
export function detectAndValidateCode(scannedCode: string): BarcodeResult {
  const code = scannedCode.toString().trim();
  const cleanCode = code.replace(/[^a-zA-Z0-9]/g, '');
  
  // First check for SKU - any alphanumeric less than 10 chars
  if (isValidSku(code)) {
    return { 
      type: 'SKU', 
      valid: true, 
      code: cleanCode, 
      originalCode: code,
      displayCode: code  // Keep original format for display
    };
  }
  
  // ISBN-10: 10 digits, last can be X
  if (cleanCode.length === 10 && /^\d{9}[0-9X]$/i.test(cleanCode)) {
    const isValid = isbn(cleanCode);
    return { 
      type: 'ISBN-10', 
      valid: typeof isValid === 'boolean' ? isValid : false, 
      code: cleanCode, 
      originalCode: code,
      displayCode: cleanCode // Cleaned version for display
    };
  }
  
  // UPC: Exactly 12 digits, must use UPC-specific validation
  if (isUpc(cleanCode)) {
    const isValid = upc(cleanCode);
    return { 
      type: 'UPC', 
      valid: typeof isValid === 'boolean' ? isValid : false, 
      code: cleanCode, 
      originalCode: code,
      displayCode: cleanCode // Format as needed
    };
  }

  // EAN-13 or ISBN-13: 13 digits
  if (isEan(cleanCode)) {
    const isValidEAN = ean(cleanCode);
    // ISBN-13 starts with 978 or 979
    const type = (cleanCode.startsWith('978') || cleanCode.startsWith('979')) ? 'ISBN-13' : 'EAN-13';
    return { 
      type, 
      valid: typeof isValidEAN === 'boolean' ? isValidEAN : false, 
      code: cleanCode, 
      originalCode: code,
      displayCode: cleanCode // Format as needed
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
export function isValidSku(sku: string): boolean {
  // Clean the code by removing non-alphanumeric characters
  const cleaned = sku.replace(/[^a-zA-Z0-9]/g, '');
  
  // Check if the cleaned length is valid (less than 10 chars)
  return cleaned.length > 0 && cleaned.length < 10;
}

// Helper function to determine if a code is a UPC by checking its format
// UPC codes must be exactly 12 digits
export function isUpc(code: string): boolean {
  return /^\d{12}$/.test(code);
}

// Helper function to determine if a code is an EAN by checking its format
// EAN-13 codes must be exactly 13 digits
export function isEan(code: string): boolean {
  return /^\d{13}$/.test(code);
}
