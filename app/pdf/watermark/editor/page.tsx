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
  Droplet,
  Image as ImageIcon,
  Type,
  Loader2,
  Settings,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getPdfJs } from '@/lib/pdfUtils';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

type WatermarkType = 'text' | 'image';
type WatermarkPosition =
  | 'center'
  | 'diagonal'
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export default function WatermarkEditor() {
  const router = useRouter();
  const { toast } = useToast();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [watermarkType, setWatermarkType] = useState<WatermarkType>('text');
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkImage, setWatermarkImage] = useState<string | null>(null);
  const [loadedWatermarkImage, setLoadedWatermarkImage] =
    useState<HTMLImageElement | null>(null);
  const [opacity, setOpacity] = useState(30);
  const [fontSize, setFontSize] = useState(50);
  const [rotation, setRotation] = useState(45);
  const [position, setPosition] = useState<WatermarkPosition>('diagonal');
  const [color, setColor] = useState('#808080');
  const [imageScale, setImageScale] = useState(100);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const watermarkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fileData = sessionStorage.getItem('watermark_pdf_file');
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
        router.push('/pdf/watermark');
      }
    } else {
      router.push('/pdf/watermark');
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
    if (watermarkImage) {
      const img = new Image();
      img.onload = () => {
        setLoadedWatermarkImage(img);
      };
      img.src = watermarkImage;
    } else {
      setLoadedWatermarkImage(null);
    }
  }, [watermarkImage]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pdfDoc,
    currentPage,
    scale,
    watermarkText,
    loadedWatermarkImage,
    opacity,
    fontSize,
    rotation,
    position,
    color,
    watermarkType,
    imageScale,
  ]);

  const renderPage = async () => {
    if (!pdfDoc || !canvasRef.current || !watermarkCanvasRef.current) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {}
      renderTaskRef.current = null;
    }

    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale });

    const canvas = canvasRef.current;
    const watermarkCanvas = watermarkCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const wctx = watermarkCanvas.getContext('2d');
    if (!ctx || !wctx) return;

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    watermarkCanvas.width = viewport.width;
    watermarkCanvas.height = viewport.height;

    const renderTask = page.render({ canvasContext: ctx, viewport });
    renderTaskRef.current = renderTask;
    try {
      await renderTask.promise;
      renderTaskRef.current = null;

      wctx.clearRect(0, 0, watermarkCanvas.width, watermarkCanvas.height);
      renderWatermark(wctx, viewport.width, viewport.height);
    } catch (error) {
      if (error !== 'cancelled') {
        console.error('Render error:', error);
      }
    }
  };

  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [0.5, 0.5, 0.5];
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
    ];
  };

  const getWatermarkPosition = (
    pageWidth: number,
    pageHeight: number,
    _textWidth: number
  ): { x: number; y: number } => {
    const margin = 50;

    switch (position) {
      case 'center':
        return { x: pageWidth / 2, y: pageHeight / 2 };
      case 'diagonal':
        return { x: pageWidth / 2, y: pageHeight / 2 };
      case 'top':
        return { x: pageWidth / 2, y: margin };
      case 'bottom':
        return { x: pageWidth / 2, y: pageHeight - margin };
      case 'top-left':
        return { x: margin, y: margin };
      case 'top-right':
        return { x: pageWidth - margin, y: margin };
      case 'bottom-left':
        return { x: margin, y: pageHeight - margin };
      case 'bottom-right':
        return { x: pageWidth - margin, y: pageHeight - margin };
      default:
        return { x: pageWidth / 2, y: pageHeight / 2 };
    }
  };

  const renderWatermark = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const pos = getWatermarkPosition(width, height, 0);

    ctx.save();
    ctx.translate(pos.x, pos.y);

    if (position === 'diagonal') {
      ctx.rotate((rotation * Math.PI) / 180);
    }

    ctx.globalAlpha = opacity / 100;

    if (watermarkType === 'text' && watermarkText) {
      const [r, g, b] = hexToRgb(color);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.font = `${fontSize * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(watermarkText, 0, 0);
    } else if (watermarkType === 'image' && loadedWatermarkImage) {
      const imgWidth =
        ((loadedWatermarkImage.width * imageScale) / 100) * scale;
      const imgHeight =
        ((loadedWatermarkImage.height * imageScale) / 100) * scale;
      ctx.drawImage(
        loadedWatermarkImage,
        -imgWidth / 2,
        -imgHeight / 2,
        imgWidth,
        imgHeight
      );
    }

    ctx.restore();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setWatermarkImage(event.target?.result as string);
        setWatermarkType('image');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePDF = async () => {
    if (!pdfFile) return;

    setIsSaving(true);
    try {
      const existingPdfBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();

      if (watermarkType === 'text' && watermarkText) {
        const [r, g, b] = hexToRgb(color);

        for (const page of pages) {
          const { width, height } = page.getSize();
          const textWidth = (watermarkText.length * fontSize) / 2;
          const pos = {
            x:
              position === 'center' || position === 'diagonal'
                ? width / 2 - textWidth / 2
                : position.includes('right')
                ? width - textWidth - 50
                : 50,
            y: position.includes('top')
              ? height - 50
              : position.includes('bottom')
              ? 50
              : height / 2,
          };

          page.drawText(watermarkText, {
            x: pos.x,
            y: pos.y,
            size: fontSize,
            color: rgb(r / 255, g / 255, b / 255),
            opacity: opacity / 100,
            rotate: degrees(position === 'diagonal' ? rotation : 0),
          });
        }
      } else if (watermarkType === 'image' && watermarkImage) {
        const imageBytes = await fetch(watermarkImage).then((res) =>
          res.arrayBuffer()
        );
        let embeddedImage;

        if (watermarkImage.includes('image/png')) {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        }

        const scaledWidth = (embeddedImage.width * imageScale) / 100;
        const scaledHeight = (embeddedImage.height * imageScale) / 100;

        for (const page of pages) {
          const { width, height } = page.getSize();
          const pos = {
            x:
              position === 'center' || position === 'diagonal'
                ? width / 2 - scaledWidth / 2
                : position.includes('right')
                ? width - scaledWidth - 50
                : 50,
            y: position.includes('top')
              ? height - scaledHeight - 50
              : position.includes('bottom')
              ? 50
              : height / 2 - scaledHeight / 2,
          };

          page.drawImage(embeddedImage, {
            x: pos.x,
            y: pos.y,
            width: scaledWidth,
            height: scaledHeight,
            opacity: opacity / 100,
            rotate: degrees(position === 'diagonal' ? rotation : 0),
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFile.name.replace('.pdf', '_watermarked.pdf');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'Watermarked PDF saved successfully',
      });

      sessionStorage.removeItem('watermark_pdf_file');
      setMobileSettingsOpen(false);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save watermarked PDF',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderSettingsContent = () => (
    <>
      <Tabs
        value={watermarkType}
        onValueChange={(v) => setWatermarkType(v as WatermarkType)}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="text">
            <Type className="h-4 w-4 mr-2" />
            Text
          </TabsTrigger>
          <TabsTrigger value="image">
            <ImageIcon className="h-4 w-4 mr-2" />
            Image
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="watermark-text">Watermark Text</Label>
            <Input
              id="watermark-text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="Enter watermark text"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="font-size">Font Size: {fontSize}px</Label>
            <Slider
              id="font-size"
              min={20}
              max={100}
              step={5}
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
                placeholder="#808080"
                className="flex-1 h-11"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="image" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Upload Image/Logo</Label>
            <Input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="h-11"
            />
            {watermarkImage && (
              <div className="mt-2 p-2 border rounded">
                <img
                  src={watermarkImage}
                  alt="Watermark preview"
                  className="max-h-20 mx-auto"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="image-scale">Image Size: {imageScale}%</Label>
            <Slider
              id="image-scale"
              min={25}
              max={200}
              step={5}
              value={[imageScale]}
              onValueChange={(v) => setImageScale(v[0])}
              className="py-2"
            />
          </div>
        </TabsContent>
      </Tabs>

      <Separator className="my-4" />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="position">Position</Label>
          <Select
            value={position}
            onValueChange={(v) => setPosition(v as WatermarkPosition)}
          >
            <SelectTrigger id="position" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="diagonal">Diagonal (Center)</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
              <SelectItem value="top-left">Top Left</SelectItem>
              <SelectItem value="top-right">Top Right</SelectItem>
              <SelectItem value="bottom-left">Bottom Left</SelectItem>
              <SelectItem value="bottom-right">Bottom Right</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="opacity">Opacity: {opacity}%</Label>
          <Slider
            id="opacity"
            min={10}
            max={100}
            step={5}
            value={[opacity]}
            onValueChange={(v) => setOpacity(v[0])}
            className="py-2"
          />
        </div>

        {position === 'diagonal' && (
          <div className="space-y-2">
            <Label htmlFor="rotation">Rotation: {rotation}°</Label>
            <Slider
              id="rotation"
              min={-90}
              max={90}
              step={5}
              value={[rotation]}
              onValueChange={(v) => setRotation(v[0])}
              className="py-2"
            />
          </div>
        )}
      </div>

      <Separator className="my-4" />

      <div className="space-y-2">
        <Button
          onClick={handleSavePDF}
          disabled={
            isSaving ||
            (watermarkType === 'text' && !watermarkText) ||
            (watermarkType === 'image' && !watermarkImage)
          }
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
              Save Watermarked PDF
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            sessionStorage.removeItem('watermark_pdf_file');
            router.push('/pdf/watermark');
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
        {/* Desktop Sidebar - Hidden on Mobile */}
        <div className="hidden lg:flex w-80 border-r bg-card flex-col overflow-auto">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Droplet className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Watermark Settings</h2>
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
                    <Droplet className="h-5 w-5 text-primary" />
                    Watermark Settings
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
                  ref={watermarkCanvasRef}
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
