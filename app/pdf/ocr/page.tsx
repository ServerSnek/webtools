'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PDFTool from '@/components/PDFTool';
import { useToast } from '@/hooks/use-toast';
import { ScanText } from 'lucide-react';

export default function OCRPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileSelection = async (files: File[]) => {
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
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        sessionStorage.setItem('ocr_pdf_file', dataUrl);
        router.push('/pdf/ocr/editor');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File reading error:', error);
      toast({
        title: 'Error',
        description: 'Failed to read PDF file. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <PDFTool
      title="PDF OCR"
      description="Extract text from scanned PDFs and images - 100% browser-based, supports 100+ languages"
      acceptMultiple={false}
      actionButtonText="Start Text Extraction"
      onProcess={handleFileSelection}
      onFilesChange={setSelectedFiles}
      icon={<ScanText className="h-6 w-6 text-primary" />}
    />
  );
}
