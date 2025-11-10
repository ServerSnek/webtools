'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PDFTool from '@/components/PDFTool';
import { useToast } from '@/hooks/use-toast';
import { Droplet } from 'lucide-react';

export default function WatermarkPage() {
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
        sessionStorage.setItem('watermark_pdf_file', dataUrl);
        router.push('/pdf/watermark/editor');
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
      title="Add Watermark"
      description="Add custom text or image watermarks to your PDF documents - 100% browser-based"
      acceptMultiple={false}
      actionButtonText="Continue to Editor"
      onProcess={handleFileSelection}
      onFilesChange={setSelectedFiles}
      icon={<Droplet className="h-6 w-6 text-primary" />}
    />
  );
}
