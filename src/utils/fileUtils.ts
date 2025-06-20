import { isPlatform } from '@ionic/react';
import { Filesystem, Directory, FilesystemEncoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import MD5 from 'crypto-js/md5';

// Helper function to extract just the filename from a filepath
export const extractFilename = (filepath: string): string => {
  if (isPlatform('hybrid')) {
    // For hybrid platforms, extract only the file name from the full URI
    const docsSegmentIndex = filepath.lastIndexOf('Documents/');
    
    if (docsSegmentIndex !== -1) {
      // Get everything after 'Documents/'
      let filename = filepath.substring(docsSegmentIndex + 'Documents/'.length);
      
      // Remove any trailing slash
      if (filename.endsWith('/')) {
        filename = filename.slice(0, -1);
      }
      return filename;
    } else {
      // Fallback to just taking the part after the last '/'
      let filename = filepath.substr(filepath.lastIndexOf('/') + 1);
      
      // Remove any trailing slash
      if (filename.endsWith('/')) {
        filename = filename.slice(0, -1);
      }
      return filename;
    }
  } else {
    // For web, filepath is already just the filename
    return filepath;
  }
};

// Helper function to get a displayable webview path for a file
export const getWebviewPathForFile = async (filePath: string, directory: Directory = Directory.Data): Promise<string> => {
  if (isPlatform('hybrid')) {
    // For hybrid platforms, convert file path to HTTP
    // Check if the path is already a full URI (begins with file://)
    if (filePath.startsWith('file://')) {
      // Path is already a full URI
      return Capacitor.convertFileSrc(filePath);
    } else {
      // Try to read the file using Filesystem API to make sure it exists
      try {
        await Filesystem.stat({
          path: filePath,
          directory: directory
        });
        
        // Get the full URI for the file
        const fileInfo = await Filesystem.getUri({
          path: filePath,
          directory: directory
        });
        
        return Capacitor.convertFileSrc(fileInfo.uri);
      } catch (error) {
        console.error(`Failed to get URI for file ${filePath}:`, error);
        throw error;
      }
    }
  } else {
    // For web platform, read as base64 data
    const file = await Filesystem.readFile({
      path: filePath,
      directory: directory
    });
    return `data:image/jpeg;base64,${file.data}`;
  }
};

// Create a simple hash from a string for cache busting (legacy method)
export const generateHashFromString = (input: string): string => {
  let hash = 0;
  if (input.length === 0) return hash.toString();
  
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to a positive hex string
  return Math.abs(hash).toString(16);
};

// Generate MD5 hash of a base64 string or any other content
export const generateMD5Hash = (content: string): string => {
  // Limit input size for performance in case of large files
  const sampleContent = content.length > 10000 ? content.substring(0, 10000) : content;
  return MD5(sampleContent).toString();
};

// Convert a path to a base64 string
export const base64FromPath = async (path: string): Promise<string> => {
  const response = await fetch(path);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject('method did not return a string')
      }
    };
    reader.readAsDataURL(blob);
  });
};
