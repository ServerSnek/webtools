'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
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
  ZoomIn,
  ZoomOut,
  Hash,
  Loader2,
  Settings,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getPdfJs } from '@/lib/pdfUtils';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

type PositionVertical = 'top' | 'bottom';
type PositionHorizontal = 'left' | 'center' | 'right';
type NumberFormat = 'number' | 'page-number' | 'number-total' | 'page-number-total';

export default function PageNumbersEditor() {
  const router = useRouter();
  const { toast } = useToast();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [positionVertical, setPositionVertical] = useState<PositionVertical>('bottom');
  const [positionHorizontal, setPositionHorizontal] = useState<PositionHorizontal>('center');
  const [numberFormat, setNumberFormat] = useState<NumberFormat>('number');
  const [fontSize, setFontSize] = useState(12);
  const [color, setColor] = useState('#000000');
  const [startingNumber, setStartingNumber] = useState(1);
  const [excludeFirstPage, setExcludeFirstPage] = useState(false);
  const [marginVertical, setMarginVertical] = useState(30);
  const [marginHorizontal, setMarginHorizontal] = useState(30);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    const fileData = sessionStorage.getItem('page_numbers_pdf_file');
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
        router.push('/pdf/page-numbers');
      }
    } else {
      router.push('/pdf/page-numbers');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, toast]);

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
    if (pdfDoc) {
      renderPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pdfDoc,
    currentPage,
    scale,
    positionVertical,
    positionHorizontal,
    numberFormat,
    fontSize,
    color,
    startingNumber,
    excludeFirstPage,
    marginVertical,
    marginHorizontal,
  ]);

  const renderPage = async () => {
    if (!pdfDoc || !canvasRef.current || !overlayCanvasRef.current) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {}
      renderTaskRef.current = null;
    }

    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale });

    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const octx = overlayCanvas.getContext('2d');
    if (!ctx || !octx) return;

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    overlayCanvas.width = viewport.width;
    overlayCanvas.height = viewport.height;

    const renderTask = page.render({ canvasContext: ctx, viewport });
    renderTaskRef.current = renderTask;
    try {
      await renderTask.promise;
      renderTaskRef.current = null;

      octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      renderPageNumber(octx, viewport.width, viewport.height, currentPage);
    } catch (error) {
      if (error !== 'cancelled') {
        console.error('Render error:', error);
      }
    }
  };

  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [0, 0, 0];
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
    ];
  };

  const getPageNumberText = (pageNum: number): string => {
    const offset = excludeFirstPage ? 1 : 0;
    const adjustedPageNum = (pageNum - 1 - offset) + startingNumber;
    const totalNumberedPages = numPages - offset;
    const lastPageNumber = startingNumber + (totalNumberedPages - 1);

    switch (numberFormat) {
      case 'number':
        return `${adjustedPageNum}`;
      case 'page-number':
        return `Page ${adjustedPageNum}`;
      case 'number-total':
        return `${adjustedPageNum}/${lastPageNumber}`;
      case 'page-number-total':
        return `Page ${adjustedPageNum} of ${lastPageNumber}`;
      default:
        return `${adjustedPageNum}`;
    }
  };

  const renderPageNumber = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    pageNum: number
  ) => {
    if (excludeFirstPage && pageNum === 1) return;

    const text = getPageNumberText(pageNum);
    const [r, g, b] = hexToRgb(color);
    
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.font = `${fontSize * scale}px Arial`;

    let x: number;
    const y = positionVertical === 'top' 
      ? marginVertical * scale
      : height - (marginVertical * scale);

    ctx.textBaseline = positionVertical === 'top' ? 'top' : 'bottom';

    switch (positionHorizontal) {
      case 'left':
        ctx.textAlign = 'left';
        x = marginHorizontal * scale;
        break;
      case 'center':
        ctx.textAlign = 'center';
        x = width / 2;
        break;
      case 'right':
        ctx.textAlign = 'right';
        x = width - (marginHorizontal * scale);
        break;
    }

    ctx.fillText(text, x, y);
  };

  const handleSavePDF = async () => {
    if (!pdfFile) return;

    setIsSaving(true);
    try {
      const existingPdfBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const [r, g, b] = hexToRgb(color);

      pages.forEach((page, index) => {
        const pageNum = index + 1;
        
        if (excludeFirstPage && pageNum === 1) return;

        const { width, height } = page.getSize();
        const text = getPageNumberText(pageNum);

        let x: number;
        const y = positionVertical === 'top' 
          ? height - marginVertical
          : marginVertical;

        switch (positionHorizontal) {
          case 'left':
            x = marginHorizontal;
            break;
          case 'center':
            x = width / 2 - (font.widthOfTextAtSize(text, fontSize) / 2);
            break;
          case 'right':
            x = width - marginHorizontal - font.widthOfTextAtSize(text, fontSize);
            break;
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(r / 255, g / 255, b / 255),
        });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFile.name.replace('.pdf', '_numbered.pdf');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'PDF with page numbers saved successfully',
      });

      sessionStorage.removeItem('page_numbers_pdf_file');
      setMobileSettingsOpen(false);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save PDF with page numbers',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderSettingsContent = () => (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="format">Number Format</Label>
          <Select value={numberFormat} onValueChange={(v) => setNumberFormat(v as NumberFormat)}>
            <SelectTrigger id="format" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="number">1, 2, 3...</SelectItem>
              <SelectItem value="page-number">Page 1, Page 2...</SelectItem>
              <SelectItem value="number-total">1/10, 2/10...</SelectItem>
              <SelectItem value="page-number-total">Page 1 of 10...</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vertical-position">Vertical Position</Label>
          <Select value={positionVertical} onValueChange={(v) => setPositionVertical(v as PositionVertical)}>
            <SelectTrigger id="vertical-position" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="horizontal-position">Horizontal Position</Label>
          <Select value={positionHorizontal} onValueChange={(v) => setPositionHorizontal(v as PositionHorizontal)}>
            <SelectTrigger id="horizontal-position" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="font-size">Font Size: {fontSize}pt</Label>
          <Slider
            id="font-size"
            min={8}
            max={24}
            step={1}
            value={[fontSize]}
            onValueChange={(v) => setFontSize(v[0])}
            className="py-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <div className="flex gap-2 items-center">
            <Input
              id="color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-20 h-11"
            />
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#000000"
              className="flex-1 h-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="starting-number">Starting Number</Label>
          <Input
            id="starting-number"
            type="number"
            min="1"
            value={startingNumber}
            onChange={(e) => setStartingNumber(parseInt(e.target.value) || 1)}
            className="h-11"
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="exclude-first" className="flex-1">
            Exclude First Page
          </Label>
          <Switch
            id="exclude-first"
            checked={excludeFirstPage}
            onCheckedChange={setExcludeFirstPage}
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="margin-v">Vertical Margin: {marginVertical}pt</Label>
          <Slider
            id="margin-v"
            min={10}
            max={100}
            step={5}
            value={[marginVertical]}
            onValueChange={(v) => setMarginVertical(v[0])}
            className="py-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="margin-h">Horizontal Margin: {marginHorizontal}pt</Label>
          <Slider
            id="margin-h"
            min={10}
            max={100}
            step={5}
            value={[marginHorizontal]}
            onValueChange={(v) => setMarginHorizontal(v[0])}
            className="py-2"
          />
        </div>
      </div>

      <Separator className="my-4" />

      <div className="space-y-2">
        <Button
          onClick={handleSavePDF}
          disabled={isSaving}
          className="w-full h-11"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Save Numbered PDF
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            sessionStorage.removeItem('page_numbers_pdf_file');
            router.push('/pdf/page-numbers');
          }}
          className="w-full h-11"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Upload
        </Button>
      </div>
    </>
  );

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
              <Hash className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Page Number Settings</h2>
            </div>
            {renderSettingsContent()}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Controls Bar */}
          <div className="border-b bg-card p-3 lg:p-4 flex items-center justify-between gap-2 flex-wrap">
            {/* Mobile Settings Button */}
            <Sheet open={mobileSettingsOpen} onOpenChange={setMobileSettingsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden min-h-[44px] px-4">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[90vh] overflow-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5 text-primary" />
                    Page Number Settings
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  {renderSettingsContent()}
                </div>
              </SheetContent>
            </Sheet>

            {/* Page Navigation */}
            <div className="flex items-center gap-1 lg:gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
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
                disabled={currentPage === numPages}
                className="min-h-[44px] min-w-[44px] p-0 lg:px-3"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 lg:gap-2">
              <Button
                variant="outline"
                onClick={() => setScale(Math.max(0.5, scale - 0.25))}
                className="min-h-[44px] min-w-[44px] p-0 lg:px-3"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs lg:text-sm w-12 lg:w-16 text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="outline"
                onClick={() => setScale(Math.min(3, scale + 0.25))}
                className="min-h-[44px] min-w-[44px] p-0 lg:px-3"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* PDF Canvas Area */}
          <div className="flex-1 overflow-auto bg-muted/20 p-2 lg:p-8">
            <div className="relative mx-auto w-full lg:w-fit flex justify-center">
              <div className="relative inline-block">
                <canvas 
                  ref={canvasRef} 
                  className="border shadow-lg bg-white max-w-full h-auto" 
                />
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute top-0 left-0 pointer-events-none max-w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
