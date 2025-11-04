'use client';

import PDFTool from '@/components/PDFTool';
import { useToast } from '@/hooks/use-toast';

export default function PDFToWord() {
  const { toast } = useToast();

  const handleConvert = async (files: File[]) => {
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
      // match the backend field names exactly
      formData.append('fileInput', file);
      formData.append('outputFormat', 'docx');
      formData.append('field', 'lol1');

      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || 'http://13.204.116.49:8080';

      const response = await fetch(`${backendUrl}/api/v1/convert/pdf/word`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Conversion failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.pdf$/i, '.docx');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Conversion Complete',
        description: 'PDF successfully converted to Word document.',
      });
    } catch (error) {
      console.log('error here :: ', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to convert PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <PDFTool
      title="PDF to Word"
      description="Convert PDF to editable Word document"
      acceptMultiple={false}
      actionButtonText="Convert to Word"
      onProcess={handleConvert}
    />
  );
}
