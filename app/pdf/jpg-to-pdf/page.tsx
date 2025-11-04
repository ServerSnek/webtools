"use client";

import PDFTool from "@/components/PDFTool";
import { useToast } from "@/hooks/use-toast";

export default function JPGToPDF() {
  const { toast } = useToast();

  const handleConvert = async (files: File[]) => {
    if (files.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one image file",
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/convert/jpg-to-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Conversion failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = files.length === 1 
        ? files[0].name.replace(/\.(jpg|jpeg|png)$/i, '.pdf')
        : 'images.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Conversion Complete",
        description: `Successfully converted ${files.length} image(s) to PDF`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to convert images. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <PDFTool
      title="JPG to PDF"
      description="Convert images to PDF document"
      acceptMultiple={true}
      actionButtonText="Convert to PDF"
      onProcess={handleConvert}
      acceptedFileTypes=".jpg,.jpeg,.png,image/jpeg,image/png"
      fileTypeFilter="image/jpeg,image/png"
      uploadLabel="Image"
    />
  );
}
