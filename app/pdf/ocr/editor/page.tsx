'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ScanText,
  Copy,
  FileText,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getPdfJs } from '@/lib/pdfUtils';
import { createWorker, Worker } from 'tesseract.js';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';

const SUPPORTED_LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'spa', name: 'Spanish' },
  { code: 'fra', name: 'French' },
  { code: 'deu', name: 'German' },
  { code: 'ita', name: 'Italian' },
  { code: 'por', name: 'Portuguese' },
  { code: 'rus', name: 'Russian' },
  { code: 'chi_sim', name: 'Chinese (Simplified)' },
  { code: 'chi_tra', name: 'Chinese (Traditional)' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'kor', name: 'Korean' },
  { code: 'ara', name: 'Arabic' },
  { code: 'hin', name: 'Hindi' },
];

export default function OCREditor() {
  const router = useRouter();
  const { toast } = useToast();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale] = useState(1.5);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('eng');
  const [currentPageText, setCurrentPageText] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const fileData = sessionStorage.getItem('ocr_pdf_file');
    if (fileData) {
      try {
        const blob = dataURItoBlob(fileData);
        const file = new File([blob], 'document.pdf', {
          type: 'application/pdf',
        });
        setPdfFile(file);
        loadPDF(file);
      } catch (error) {
        console.error('Error loading PDF from session:', error);
        toast({
          title: 'Error',
          description: 'Failed to load PDF. Please try uploading again.',
          variant: 'destructive',
        });
        router.push('/pdf/ocr');
      }
    } else {
      router.push('/pdf/ocr');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, toast]);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const dataURItoBlob = (dataURI: string) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  const loadPDF = async (file: File) => {
    try {
      setIsLoading(true);
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await getPdfJs();
      const loadingTask = pdfjsLib.getDocument(new Uint8Array(arrayBuffer));
      const pdf = await loadingTask.promise;

      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      setCurrentPage(1);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast({
        title: 'Error Loading PDF',
        description: 'Failed to load PDF file',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (pdfDoc && !isProcessing) {
      renderPage(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, currentPage]);

  const renderPage = async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {}
      renderTaskRef.current = null;
    }

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderTask = page.render({ canvasContext: ctx, viewport });
    renderTaskRef.current = renderTask;
    try {
      await renderTask.promise;
      renderTaskRef.current = null;
    } catch (error) {
      if (error !== 'cancelled') {
        console.error('Render error:', error);
      }
    }
  };

  const processAllPages = async () => {
    if (!pdfDoc) return;

    setIsProcessing(true);
    setProgress(0);
    setExtractedText('');

    let worker: Worker | null = null;

    try {
      worker = await createWorker(selectedLanguage, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      workerRef.current = worker;

      let fullText = '';

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        setCurrentPage(pageNum);
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        await page.render({ canvasContext: ctx, viewport }).promise;

        const {
          data: { text },
        } = await worker.recognize(canvas);

        fullText += `\n--- Page ${pageNum} ---\n${text}\n`;
        setExtractedText(fullText);
        setProgress((pageNum / numPages) * 100);
      }

      toast({
        title: 'Success',
        description: `Extracted text from ${numPages} page${
          numPages > 1 ? 's' : ''
        }`,
      });
    } catch (error) {
      console.error('OCR error:', error);
      toast({
        title: 'Error',
        description: 'Failed to extract text from PDF',
        variant: 'destructive',
      });
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (error) {
          console.error('Error terminating worker:', error);
        }
      }
      workerRef.current = null;
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const processCurrentPage = async () => {
    if (!pdfDoc || !canvasRef.current) return;

    setIsProcessing(true);

    let worker: Worker | null = null;

    try {
      worker = await createWorker(selectedLanguage);
      workerRef.current = worker;

      const {
        data: { text },
      } = await worker.recognize(canvasRef.current);

      setCurrentPageText(text);

      toast({
        title: 'Success',
        description: `Extracted text from page ${currentPage}`,
      });
    } catch (error) {
      console.error('OCR error:', error);
      toast({
        title: 'Error',
        description: 'Failed to extract text',
        variant: 'destructive',
      });
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (error) {
          console.error('Error terminating worker:', error);
        }
      }
      workerRef.current = null;
      setIsProcessing(false);
    }
  };

  const handleDownloadText = () => {
    const textToDownload = extractedText || currentPageText;
    if (!textToDownload) {
      toast({
        title: 'No Text',
        description: 'Please extract text first',
        variant: 'destructive',
      });
      return;
    }

    const blob = new Blob([textToDownload], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pdfFile?.name.replace('.pdf', '_extracted.txt') || 'extracted_text.txt';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: 'Downloaded',
      description: 'Text file saved successfully',
    });
  };

  const handleCopyText = () => {
    const textToCopy = extractedText || currentPageText;
    if (!textToCopy) {
      toast({
        title: 'No Text',
        description: 'Please extract text first',
        variant: 'destructive',
      });
      return;
    }

    navigator.clipboard.writeText(textToCopy);
    toast({
      title: 'Copied',
      description: 'Text copied to clipboard',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex w-80 border-r bg-card flex-col overflow-auto">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <ScanText className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">OCR Settings</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger id="language" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={processCurrentPage}
                  disabled={isProcessing}
                  className="w-full h-11"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ScanText className="h-4 w-4 mr-2" />
                      Extract Current Page
                    </>
                  )}
                </Button>

                <Button
                  onClick={processAllPages}
                  disabled={isProcessing}
                  variant="outline"
                  className="w-full h-11"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Extract All Pages
                    </>
                  )}
                </Button>
              </div>

              {isProcessing && extractedText && (
                <div className="space-y-2">
                  <Label>Progress</Label>
                  <Progress value={progress} />
                  <p className="text-xs text-muted-foreground text-center">
                    {Math.round(progress)}%
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Button
                  onClick={handleCopyText}
                  disabled={!extractedText && !currentPageText}
                  variant="outline"
                  className="w-full h-11"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Text
                </Button>

                <Button
                  onClick={handleDownloadText}
                  disabled={!extractedText && !currentPageText}
                  variant="outline"
                  className="w-full h-11"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download as TXT
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  sessionStorage.removeItem('ocr_pdf_file');
                  router.push('/pdf/ocr');
                }}
                className="w-full h-11"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Upload
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* PDF Preview */}
          <div className="flex-1 flex flex-col overflow-hidden border-r">
            <div className="border-b bg-card p-3 lg:p-4 flex items-center justify-between">
              <div className="flex items-center gap-1 lg:gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || isProcessing}
                  className="min-h-[44px] min-w-[44px] p-0 lg:px-3"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs lg:text-sm whitespace-nowrap px-1 lg:px-2">
                  {currentPage}/{numPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentPage(Math.min(numPages, currentPage + 1))
                  }
                  disabled={currentPage === numPages || isProcessing}
                  className="min-h-[44px] min-w-[44px] p-0 lg:px-3"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Mobile Action Buttons */}
              <div className="flex lg:hidden gap-2">
                <Button
                  onClick={processCurrentPage}
                  disabled={isProcessing}
                  size="sm"
                  className="min-h-[44px]"
                >
                  <ScanText className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-muted/20 p-2 lg:p-8">
              <div className="relative mx-auto w-full lg:w-fit flex justify-center">
                <canvas
                  ref={canvasRef}
                  className="border shadow-lg bg-white max-w-full h-auto"
                />
              </div>
            </div>
          </div>

          {/* Extracted Text Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b bg-card p-3 lg:p-4">
              <h3 className="font-semibold">Extracted Text</h3>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {extractedText || currentPageText ? (
                <Textarea
                  value={extractedText || currentPageText}
                  readOnly
                  className="min-h-full font-mono text-sm resize-none"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <ScanText className="h-12 w-12 mb-4 opacity-20" />
                  <p>No text extracted yet</p>
                  <p className="text-sm mt-2">
                    Click &quot;Extract Current Page&quot; or &quot;Extract All
                    Pages&quot; to begin
                  </p>
                </div>
              )}
            </div>

            {/* Mobile Bottom Actions */}
            <div className="lg:hidden border-t bg-card p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={processAllPages}
                  disabled={isProcessing}
                  size="sm"
                  className="min-h-[44px]"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      All Pages
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleCopyText}
                  disabled={!extractedText && !currentPageText}
                  variant="outline"
                  size="sm"
                  className="min-h-[44px]"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <Button
                onClick={handleDownloadText}
                disabled={!extractedText && !currentPageText}
                variant="outline"
                className="w-full min-h-[44px]"
              >
                <Download className="h-4 w-4 mr-2" />
                Download TXT
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
