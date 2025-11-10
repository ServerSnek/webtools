import { useState, useEffect } from 'react';

// Cache structure to store loading promises and loaded documents
interface CacheEntry {
  promise: Promise<any>;
  document: any | null;
}

const pdfDocumentCache = new Map<string, CacheEntry>();

// Generate a unique key for a file
function getFileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

// Create and cache a PDF document loading promise
async function loadPdfDocument(file: File, fileKey: string): Promise<any> {
  const { getPdfJs } = await import("@/lib/pdfUtils");
  const pdfjsLib = await getPdfJs();

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  // Update cache with loaded document
  const entry = pdfDocumentCache.get(fileKey);
  if (entry) {
    entry.document = pdf;
  }

  return pdf;
}

export function usePdfDocument(file: File) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadPdf() {
      const fileKey = getFileKey(file);
      
      try {
        setLoading(true);
        setError(null);
        
        // Check if we have a cache entry for this file
        let cacheEntry = pdfDocumentCache.get(fileKey);
        
        if (!cacheEntry) {
          // Create a new cache entry with a promise before any async work
          const promise = loadPdfDocument(file, fileKey);
          cacheEntry = { promise, document: null };
          pdfDocumentCache.set(fileKey, cacheEntry);
        }

        // Wait for the shared promise
        const pdf = await cacheEntry.promise;

        if (isMounted) {
          setPdfDoc(pdf);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading PDF document:", err);
        console.error("Error details:", {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          name: err instanceof Error ? err.name : undefined,
        });
        // Clear failed cache entry to allow retry
        pdfDocumentCache.delete(fileKey);
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : "Failed to load PDF";
          setError(errorMessage);
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [file]);

  return { pdfDoc, loading, error };
}

// Get page count from cached document or create new one
export async function getPdfPageCount(file: File): Promise<number> {
  const fileKey = getFileKey(file);
  
  let cacheEntry = pdfDocumentCache.get(fileKey);
  
  if (!cacheEntry) {
    const promise = loadPdfDocument(file, fileKey);
    cacheEntry = { promise, document: null };
    pdfDocumentCache.set(fileKey, cacheEntry);
  }

  const pdf = await cacheEntry.promise;
  return pdf.numPages;
}

// Clear cache for a specific file
export function clearPdfCacheForFile(file: File) {
  const fileKey = getFileKey(file);
  const entry = pdfDocumentCache.get(fileKey);
  
  if (entry?.document) {
    try {
      entry.document.destroy();
    } catch (e) {
      // Ignore errors during cleanup
    }
  }
  
  pdfDocumentCache.delete(fileKey);
}

// Clean up all cached documents
export function clearPdfCache() {
  pdfDocumentCache.forEach((entry) => {
    if (entry.document) {
      try {
        entry.document.destroy();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
  });
  pdfDocumentCache.clear();
}
