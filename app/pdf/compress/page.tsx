// app/compress-pdf/page.tsx
'use client';

import React from 'react';
import PDFTool from '@/components/PDFTool';
import { useToast } from '@/hooks/use-toast';

export default function CompressPDFPage() {
  const { toast } = useToast();

  const handleCompress = async (files: File[]) => {
    if (files.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select a PDF file',
        variant: 'destructive',
      });
      return;
    }

    const file = files[0];

    try {
      const formData = new FormData();
      // match backend field names exactly
      formData.append('fileInput', file);
      formData.append('optimizeLevel', '8');
      formData.append('expectedOutputSize', '20KB');

      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || 'http://13.204.116.49:8080';

      const response = await fetch(`${backendUrl}/api/v1/misc/compress-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Compression failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.pdf$/i, '-compressed.pdf');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Compression Complete',
        description: 'PDF successfully compressed.',
      });
    } catch (error) {
      console.log('Compression error :: ', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to compress PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <PDFTool
      title="Compress PDF"
      description="Reduce PDF file size"
      acceptMultiple={false}
      actionButtonText="Compress PDF"
      onProcess={handleCompress}
    />
  );
}
