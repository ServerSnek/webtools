'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Upload, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import PDFPreview from '@/components/PDFPreview';
import { clearPdfCacheForFile } from '@/hooks/usePdfDocument';

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://testing-stirling.ieditonline.com';

function parseFilenameFromContentDisposition(
  header: string | null,
  fallback: string
) {
  if (!header) return fallback;
  const match = header.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);
  if (match) return decodeURIComponent(match[1]);
  return fallback;
}

export default function PDFToJPG() {
  const router = useRouter();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [imageFormat, setImageFormat] = useState<
    'jpeg' | 'png' | 'gif' | 'webp'
  >('jpeg');
  const [singleOrMultiple, setSingleOrMultiple] = useState<
    'single' | 'multiple'
  >('multiple');
  const [pageNumbers, setPageNumbers] = useState('all');
  const [colorType, setColorType] = useState<
    'color' | 'greyscale' | 'blackwhite'
  >('color');
  const [dpi, setDpi] = useState('300');

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
      (f) => f.type === 'application/pdf'
    );

    if (droppedFiles.length > 0) {
      if (file) {
        clearPdfCacheForFile(file);
      }
      setFile(droppedFiles[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      if (file) {
        clearPdfCacheForFile(file);
      }
      setFile(selectedFiles[0]);
    }
    e.currentTarget.value = '';
  };

  const removeFile = () => {
    if (file) {
      clearPdfCacheForFile(file);
    }
    setFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleConvert = async () => {
    if (!file) {
      toast({
        title: 'Error',
        description: 'Please select a PDF file.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('fileInput', file);
      formData.append('imageFormat', imageFormat);
      formData.append('singleOrMultiple', singleOrMultiple);
      formData.append('pageNumbers', pageNumbers);
      formData.append('colorType', colorType);
      formData.append('dpi', dpi);

      const res = await fetch(`${BACKEND}/api/v1/convert/pdf/img`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => null);
        throw new Error(text || `Server returned ${res.status}`);
      }

      const blob = await res.blob();

      const cd =
        res.headers.get('Content-Disposition') ||
        res.headers.get('content-disposition');
      const fallback =
        singleOrMultiple === 'single'
          ? file.name.replace(/\.pdf$/i, `.${imageFormat}`)
          : file.name.replace(/\.pdf$/i, `_images.zip`);
      const filename = parseFilenameFromContentDisposition(cd, fallback);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Conversion Complete',
        description: `PDF converted to ${imageFormat.toUpperCase()} images successfully.`,
      });
    } catch (err: any) {
      console.error('PDF to JPG error:', err);
      toast({
        title: 'Error',
        description:
          err instanceof Error
            ? err.message
            : 'Failed to convert PDF to images.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tools
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">PDF to JPG Converter</CardTitle>
            <CardDescription>
              Convert your PDF pages to high-quality images with customizable
              settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-md p-12 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25'
              }`}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {file ? 'Change PDF file' : 'Drop your PDF file here'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">or</p>
              <label>
                <input
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

            {file && (
              <div className="space-y-6">
                <div className="border rounded-md p-4">
                  <div className="flex items-start gap-4">
                    <PDFPreview
                      file={file}
                      width={120}
                      height={160}
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-medium text-sm truncate"
                            data-testid="text-filename"
                          >
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={removeFile}
                          data-testid="button-remove-file"
                          className="flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Conversion Settings</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="imageFormat">Image Format</Label>
                      <Select
                        value={imageFormat}
                        onValueChange={(value: any) => setImageFormat(value)}
                      >
                        <SelectTrigger
                          id="imageFormat"
                          data-testid="select-image-format"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="jpeg">JPEG</SelectItem>
                          <SelectItem value="png">PNG</SelectItem>
                          <SelectItem value="gif">GIF</SelectItem>
                          <SelectItem value="webp">WebP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="singleOrMultiple">Output Type</Label>
                      <Select
                        value={singleOrMultiple}
                        onValueChange={(value: any) =>
                          setSingleOrMultiple(value)
                        }
                      >
                        <SelectTrigger
                          id="singleOrMultiple"
                          data-testid="select-output-type"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">
                            Single Image (Merged)
                          </SelectItem>
                          <SelectItem value="multiple">
                            Multiple Images
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pageNumbers">Page Numbers</Label>
                      <Input
                        id="pageNumbers"
                        value={pageNumbers}
                        onChange={(e) => setPageNumbers(e.target.value)}
                        placeholder="e.g., all, 1-3, 1,3,5"
                        data-testid="input-page-numbers"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter "all" for all pages, or specify ranges/numbers
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="colorType">Color Type</Label>
                      <Select
                        value={colorType}
                        onValueChange={(value: any) => setColorType(value)}
                      >
                        <SelectTrigger
                          id="colorType"
                          data-testid="select-color-type"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="color">Color</SelectItem>
                          <SelectItem value="greyscale">Greyscale</SelectItem>
                          <SelectItem value="blackwhite">
                            Black & White
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dpi">DPI (Resolution)</Label>
                      <Select value={dpi} onValueChange={setDpi}>
                        <SelectTrigger id="dpi" data-testid="select-dpi">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="300">300 DPI</SelectItem>
                          <SelectItem value="500">500 DPI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleConvert}
                  disabled={isProcessing}
                  className="w-full"
                  data-testid="button-convert"
                >
                  {isProcessing ? (
                    <>
                      <Download className="mr-2 h-4 w-4 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Convert to {imageFormat.toUpperCase()}
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
