import { useEffect, useState, useRef } from 'react';

// Global cache to track loaded logos across components
const logoCache = new Map<string, boolean>();
// Track if image is already in browser cache
const browserImageCache = new Map<string, HTMLImageElement>();

export function useLogoPreload(logoUrl: string | null | undefined) {
  // Always call hooks in the same order - no conditional hooks
  const [isLoaded, setIsLoaded] = useState(() => {
    // Initialize from cache if available
    if (logoUrl && logoCache.has(logoUrl) && logoCache.get(logoUrl)) {
      return true;
    }
    return false;
  });
  const imgRef = useRef<HTMLImageElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Always call hooks in same order - no early returns before hooks
    if (!logoUrl) {
      setIsLoaded(false);
      currentUrlRef.current = null;
      return;
    }

    // If URL hasn't changed and already loaded, don't reload
    if (currentUrlRef.current === logoUrl && isLoaded) {
      return;
    }

    currentUrlRef.current = logoUrl;

    // Check if logo is already cached in our memory cache
    if (logoCache.has(logoUrl) && logoCache.get(logoUrl)) {
      setIsLoaded(true);
      return;
    }

    // Check if image is already in browser cache by checking if it exists in DOM
    const cachedImg = browserImageCache.get(logoUrl);
    if (cachedImg && cachedImg.complete && cachedImg.naturalHeight !== 0) {
      logoCache.set(logoUrl, true);
      setIsLoaded(true);
      return;
    }

    // Create image element to preload (only if not already loading)
    if (imgRef.current && imgRef.current.src === logoUrl) {
      // Already loading this URL, wait for it
      return;
    }

    const img = new Image();
    imgRef.current = img;

    // Store in browser cache map
    browserImageCache.set(logoUrl, img);

    const handleLoad = () => {
      logoCache.set(logoUrl, true);
      setIsLoaded(true);
    };

    const handleError = () => {
      logoCache.set(logoUrl, false);
      setIsLoaded(true); // Set to true to hide placeholder even on error
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);
    
    // Set src last to trigger load
    img.src = logoUrl;

    return () => {
      // Cleanup: remove listeners
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [logoUrl]); // Remove isLoaded from dependencies to avoid infinite loops

  return isLoaded;
}


