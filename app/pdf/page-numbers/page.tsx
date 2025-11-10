'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PDFTool from '@/components/PDFTool';
import { useToast } from '@/hooks/use-toast';
import { Hash } from 'lucide-react';

export default function PageNumbersPage() {
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
        sessionStorage.setItem('page_numbers_pdf_file', dataUrl);
        router.push('/pdf/page-numbers/editor');
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
      title="Add Page Numbers"
      description="Add customizable page numbers to your PDF - 100% browser-based"
      acceptMultiple={false}
      actionButtonText="Continue to Editor"
      onProcess={handleFileSelection}
      onFilesChange={setSelectedFiles}
      icon={<Hash className="h-6 w-6 text-primary" />}
    />
  );
}
