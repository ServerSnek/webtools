'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Upload,
  X,
  ArrowLeft,
  RotateCcw,
  RotateCw,
  Loader2,
  FileDown,
  FilePlus2,
} from 'lucide-react';
import { PDFDocument, degrees } from 'pdf-lib';
import { useToast } from '@/hooks/use-toast';
import PDFPreview from '@/components/PDFPreview';
import { clearPdfCacheForFile } from '@/hooks/usePdfDocument';

interface PdfFileData {
  file: File;
  pageCount: number;
  startPageIndex: number;
}

export default function RotatePDF() {
  const router = useRouter();
  const [pdfFiles, setPdfFiles] = useState<PdfFileData[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [pageRotations, setPageRotations] = useState<number[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [makeUniformWidth, setMakeUniformWidth] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  const addPdfFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const numPages = pdfDoc.getPageCount();

      const startPageIndex = totalPages;
      const newFileData: PdfFileData = {
        file,
        pageCount: numPages,
        startPageIndex,
      };

      setPdfFiles((prev) => [...prev, newFileData]);
      setPageRotations((prev) => [...prev, ...new Array(numPages).fill(0)]);
      setTotalPages((prev) => prev + numPages);
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to load PDF file',
        variant: 'destructive',
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === 'application/pdf'
    );

    if (droppedFiles.length > 0) {
      addPdfFile(droppedFiles[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      addPdfFile(selectedFiles[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      addPdfFile(selectedFiles[0]);
    }
    if (addFileInputRef.current) {
      addFileInputRef.current.value = '';
    }
  };

  const clearAllFiles = () => {
    pdfFiles.forEach((fileData) => {
      clearPdfCacheForFile(fileData.file);
    });
    setPdfFiles([]);
    setPageRotations([]);
    setTotalPages(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (addFileInputRef.current) {
      addFileInputRef.current.value = '';
    }
  };

  const rotatePageLeft = (pageIndex: number) => {
    const newRotations = [...pageRotations];
    newRotations[pageIndex] = (newRotations[pageIndex] - 90 + 360) % 360;
    setPageRotations(newRotations);
  };

  const rotatePageRight = (pageIndex: number) => {
    const newRotations = [...pageRotations];
    newRotations[pageIndex] = (newRotations[pageIndex] + 90) % 360;
    setPageRotations(newRotations);
  };

  const rotateAllLeft = () => {
    setPageRotations(pageRotations.map((rot) => (rot - 90 + 360) % 360));
  };

  const rotateAllRight = () => {
    setPageRotations(pageRotations.map((rot) => (rot + 90) % 360));
  };

  const getFileAndPageForIndex = (
    globalPageIndex: number
  ): { file: File; localPageNumber: number } | null => {
    for (const fileData of pdfFiles) {
      const endPageIndex = fileData.startPageIndex + fileData.pageCount;
      if (
        globalPageIndex >= fileData.startPageIndex &&
        globalPageIndex < endPageIndex
      ) {
        return {
          file: fileData.file,
          localPageNumber: globalPageIndex - fileData.startPageIndex + 1,
        };
      }
    }
    return null;
  };

  const handleDownload = async () => {
    if (pdfFiles.length === 0) return;

    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const fileData of pdfFiles) {
        const arrayBuffer = await fileData.file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();

        for (let i = 0; i < pages.length; i++) {
          const globalPageIndex = fileData.startPageIndex + i;
          const rotation = pageRotations[globalPageIndex] || 0;

          if (rotation !== 0) {
            const currentRotation = pages[i].getRotation().angle;
            const newRotation = (currentRotation + rotation) % 360;
            pages[i].setRotation(degrees(newRotation));
          }
        }

        const copiedPages = await mergedPdf.copyPages(
          pdfDoc,
          pdfDoc.getPageIndices()
        );
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      if (makeUniformWidth) {
        const allPages = mergedPdf.getPages();
        let maxWidth = 0;
        allPages.forEach((page) => {
          const { width } = page.getSize();
          if (width > maxWidth) maxWidth = width;
        });

        allPages.forEach((page) => {
          const { width } = page.getSize();
          if (width < maxWidth) {
            page.scale(maxWidth / width, maxWidth / width);
          }
        });
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `merged_rotated_${pdfFiles.length}_pdfs.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: `Successfully merged and rotated ${pdfFiles.length} PDF(s) with ${totalPages} total pages`,
      });
    } catch (error) {
      console.error('Error processing PDFs:', error);
      toast({
        title: 'Error',
        description: 'Failed to process PDFs. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerAddFile = () => {
    addFileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <Breadcrumb items={[{ label: 'Rotate PDF', href: '#' }]} />

        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Rotate PDF</h1>
            <p className="text-muted-foreground">
              Rotate individual pages or all pages in your PDF
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {pdfFiles.length === 0 ? (
          <Card className="p-8">
            <div
              className={`border-2 border-dashed rounded-md p-12 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              data-testid="dropzone-pdf"
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                Drag and drop file here
              </h3>
              <p className="text-sm text-muted-foreground mb-4">or</p>
              <label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file"
                />
                <Button variant="outline" asChild>
                  <span>Browse Files</span>
                </Button>
              </label>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: totalPages }).map((_, index) => {
                const pageInfo = getFileAndPageForIndex(index);
                if (!pageInfo) return null;

                return (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>
                      <div
                        className="relative bg-muted rounded-md overflow-hidden flex items-center justify-center"
                        style={{ minHeight: '200px' }}
                      >
                        <PDFPreview
                          file={pageInfo.file}
                          pageNumber={pageInfo.localPageNumber}
                          width={180}
                          height={240}
                          rotation={pageRotations[index] || 0}
                        />
                      </div>
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => rotatePageLeft(index)}
                          data-testid={`button-rotate-left-${index}`}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => rotatePageRight(index)}
                          data-testid={`button-rotate-right-${index}`}
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">
                Rotate All {totalPages} Pages{' '}
                {pdfFiles.length > 1 && `(from ${pdfFiles.length} PDFs)`}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={rotateAllLeft}
                  data-testid="button-rotate-all-left"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Rotate All Left
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={rotateAllRight}
                  data-testid="button-rotate-all-right"
                >
                  <RotateCw className="h-4 w-4 mr-2" />
                  Rotate All Right
                </Button>
              </div>

              <div className="flex items-center space-x-2 mb-6 pb-6 border-b">
                <Checkbox
                  id="uniform-width"
                  checked={makeUniformWidth}
                  onCheckedChange={(checked) =>
                    setMakeUniformWidth(checked as boolean)
                  }
                  data-testid="checkbox-uniform-width"
                />
                <label
                  htmlFor="uniform-width"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Make All Pages the Same Width
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  ref={addFileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleAddFile}
                  className="hidden"
                  data-testid="input-add-file"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={triggerAddFile}
                  data-testid="button-add-pdf"
                >
                  <FilePlus2 className="h-4 w-4 mr-2" />
                  Add PDF
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={clearAllFiles}
                  data-testid="button-clear-all"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>

                <Button
                  className="w-full"
                  onClick={handleDownload}
                  disabled={isProcessing}
                  data-testid="button-download"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileDown className="h-4 w-4 mr-2" />
                      Download PDF
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
