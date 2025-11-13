'use client';

import { useState } from 'react';
import PDFTool from '@/components/PDFTool';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Unlock } from 'lucide-react';

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

export default function UnlockPDF() {
  const { toast } = useToast();
  const [password, setPassword] = useState('');

  const handleUnlock = async (files: File[]) => {
    if (files.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select a PDF file.',
        variant: 'destructive',
      });
      return;
    }

    if (!password || password.trim() === '') {
      toast({
        title: 'Validation Error',
        description: 'Please enter the PDF password.',
        variant: 'destructive',
      });
      return;
    }

    const file = files[0];

    try {
      const formData = new FormData();
      formData.append('fileInput', file);
      formData.append('password', password);

      const res = await fetch(`${BACKEND}/api/v1/security/remove-password`, {
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
      const fallback = file.name.replace(/\.pdf$/i, '_unlocked.pdf');
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
        title: 'Success',
        description: 'PDF unlocked and downloaded successfully.',
      });

      setPassword('');
    } catch (err: any) {
      console.error('Unlock PDF error:', err);
      toast({
        title: 'Error',
        description:
          err instanceof Error
            ? err.message
            : 'Failed to unlock PDF. Please check the password.',
        variant: 'destructive',
      });
    }
  };

  return (
    <PDFTool
      title="Unlock PDF"
      description="Remove password protection from your PDF files"
      acceptMultiple={false}
      actionButtonText="Unlock PDF"
      onProcess={handleUnlock}
      icon={<Unlock className="h-6 w-6" />}
    >
      <Card>
        <CardHeader>
          <CardTitle>Password Settings</CardTitle>
          <CardDescription>
            Enter the password to unlock the PDF file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="password">PDF Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter PDF password"
              data-testid="input-password"
            />
            <p className="text-xs text-muted-foreground">
              This is the current password protecting the PDF
            </p>
          </div>
        </CardContent>
      </Card>
    </PDFTool>
  );
}
