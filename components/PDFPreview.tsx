'use client';

import { useEffect, useRef, useState } from 'react';
import { usePdfDocument } from '@/hooks/usePdfDocument';
import { Loader2 } from 'lucide-react';

interface PDFPreviewProps {
  file: File;
  pageNumber?: number;
  width?: number;
  height?: number;
  className?: string;
  rotation?: number;
}

export default function PDFPreview({
  file,
  pageNumber = 1,
  width = 150,
  height = 200,
  className = '',
  rotation = 0,
}: PDFPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { pdfDoc, loading: docLoading, error: docError } = usePdfDocument(file);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function renderPage() {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        setLoading(true);
        setError(null);

        const page = await pdfDoc.getPage(pageNumber);
        const canvas = canvasRef.current;
        if (!canvas || !isMounted) {
          return;
        }

        const context = canvas.getContext('2d');
        if (!context) {
          return;
        }

        const viewport = page.getViewport({ scale: 1, rotation });
        const scale = Math.min(
          width / viewport.width,
          height / viewport.height
        );
        const scaledViewport = page.getViewport({ scale, rotation });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        renderTaskRef.current = page.render({
          canvasContext: context,
          viewport: scaledViewport,
        });

        await renderTaskRef.current.promise;

        if (isMounted) {
          setLoading(false);
        }
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException') {
          return;
        }
        console.error('Error rendering PDF page:', err);
        if (isMounted) {
          setError('Failed to render page');
          setLoading(false);
        }
      }
    }

    if (pdfDoc) {
      renderPage();
    }

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // Ignore cancellation errors
        }
      }
    };
  }, [pdfDoc, pageNumber, width, height, rotation]);

  // Use document loading state if document is still loading
  const isLoading = docLoading || loading;
  const displayError = docError || error;

  return (
    <div
      className={`relative bg-muted rounded-md overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {displayError && (
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <p className="text-xs text-center text-destructive">{displayError}</p>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`max-w-full max-h-full ${
          isLoading || displayError ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  );
}
