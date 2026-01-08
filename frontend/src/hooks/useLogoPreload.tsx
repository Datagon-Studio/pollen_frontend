import { useEffect, useState, useRef } from 'react';

// Global cache to track loaded logos across components
const logoCache = new Map<string, boolean>();

export function useLogoPreload(logoUrl: string | null | undefined) {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!logoUrl) {
      setIsLoaded(false);
      return;
    }

    // Check if logo is already cached
    if (logoCache.has(logoUrl) && logoCache.get(logoUrl)) {
      setIsLoaded(true);
      return;
    }

    // Create image element to preload
    const img = new Image();
    imgRef.current = img;

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
    img.src = logoUrl;

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [logoUrl]);

  return isLoaded;
}

