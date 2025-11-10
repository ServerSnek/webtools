"use client";

import PDFTool from "@/components/PDFTool";
import { useToast } from "@/hooks/use-toast";

export default function PDFToJPG() {
  const { toast } = useToast();

  const handleConvert = async (files: File[]) => {
    if (files.length === 0) {
      toast({
        title: "Error",
        description: "Please select a PDF file",
        variant: "destructive",
      });
      return;
    }

    const file = files[0];

    try {
      const formData = new FormData();
      formData.append('file', file);

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/convert/pdf-to-jpg`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Conversion failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace('.pdf', '.zip');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Conversion Complete",
        description: "PDF converted to JPG images",
      });
    } catch (error) {
      toast({
        title: "Feature Not Available",
        description: error instanceof Error ? error.message : "This conversion requires pdf2image or similar server-side libraries.",
        variant: "destructive",
      });
    }
  };

  return (
    <PDFTool
      title="PDF to JPG"
      description="Convert PDF pages to JPG images (requires backend service)"
      acceptMultiple={false}
      actionButtonText="Convert to JPG"
      onProcess={handleConvert}
    />
  );
}
