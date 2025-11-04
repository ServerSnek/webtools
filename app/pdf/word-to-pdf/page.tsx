"use client";

import PDFTool from "@/components/PDFTool";
import { useToast } from "@/hooks/use-toast";

export default function WordToPDF() {
  const { toast } = useToast();

  const handleConvert = async (files: File[]) => {
    if (files.length === 0) {
      toast({
        title: "Error",
        description: "Please select a Word file",
        variant: "destructive",
      });
      return;
    }

    const file = files[0];

    try {
      const formData = new FormData();
      formData.append('file', file);

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/convert/doc-to-pdf`, {
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
      a.download = file.name.replace(/\.(docx?|doc)$/i, '.pdf');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Conversion Complete",
        description: "Word document converted to PDF",
      });
    } catch (error) {
      toast({
        title: "Feature Not Available",
        description: error instanceof Error ? error.message : "This conversion requires a backend service with LibreOffice or a commercial API.",
        variant: "destructive",
      });
    }
  };

  return (
    <PDFTool
      title="Word to PDF"
      description="Convert Word documents to PDF (requires backend service)"
      acceptMultiple={false}
      actionButtonText="Convert to PDF"
      onProcess={handleConvert}
      acceptedFileTypes=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      uploadLabel="Word Document"
    />
  );
}
