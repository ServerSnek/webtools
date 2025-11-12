'use client';

import { useState } from 'react';
import PDFTool from '@/components/PDFTool';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
  const { toast } = useToast();
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

  const handleConvert = async (files: File[]) => {
    if (files.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select a PDF file.',
        variant: 'destructive',
      });
      return;
    }

    const file = files[0];

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
    }
  };

  return (
    <PDFTool
      title="PDF to JPG"
      description="Convert your PDF pages to high-quality images with customizable settings"
      acceptMultiple={false}
      actionButtonText={`Convert to ${imageFormat.toUpperCase()}`}
      onProcess={handleConvert}
    >
      <Card>
        <CardHeader>
          <CardTitle>Conversion Settings</CardTitle>
          <CardDescription>
            Customize the output format and quality
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                onValueChange={(value: any) => setSingleOrMultiple(value)}
              >
                <SelectTrigger
                  id="singleOrMultiple"
                  data-testid="select-output-type"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Image (Merged)</SelectItem>
                  <SelectItem value="multiple">Multiple Images</SelectItem>
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
                <SelectTrigger id="colorType" data-testid="select-color-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="color">Color</SelectItem>
                  <SelectItem value="greyscale">Greyscale</SelectItem>
                  <SelectItem value="blackwhite">Black & White</SelectItem>
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
        </CardContent>
      </Card>
    </PDFTool>
  );
}
