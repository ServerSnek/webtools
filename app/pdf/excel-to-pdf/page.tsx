"use client";

import PDFTool from "@/components/PDFTool";
import { useToast } from "@/hooks/use-toast";

export default function ExcelToPDF() {
  const { toast } = useToast();

  const handleConvert = async (files: File[]) => {
    if (files.length === 0) {
      toast({
        title: "Error",
        description: "Please select an Excel file",
        variant: "destructive",
      });
      return;
    }

    const file = files[0];

    try {
      const formData = new FormData();
      formData.append('file', file);

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/convert/excel-to-pdf`, {
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
      a.download = file.name.replace(/\.(xlsx?|xls)$/i, '.pdf');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Conversion Complete",
        description: "Excel spreadsheet converted to PDF",
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
      title="Excel to PDF"
      description="Convert Excel spreadsheets to PDF (requires backend service)"
      acceptMultiple={false}
      actionButtonText="Convert to PDF"
      onProcess={handleConvert}
      acceptedFileTypes=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      uploadLabel="Excel Spreadsheet"
    />
  );
}
