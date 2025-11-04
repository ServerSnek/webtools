'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Breadcrumb } from '@/components/Breadcrumb';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, FileText, X, ArrowLeft, Lock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://13.204.116.49:8080';

function parseFilenameFromContentDisposition(
  header: string | null,
  fallback: string
) {
  if (!header) return fallback;
  // support filename* and filename
  const match = header.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);
  if (match) return decodeURIComponent(match[1]);
  return fallback;
}

export default function ProtectPDF() {
  const router = useRouter();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [password, setPassword] = useState('');
  const [encryption, setEncryption] = useState<'128' | '256'>('128');
  const [isProcessing, setIsProcessing] = useState(false);

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
      setFile(droppedFiles[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFile(selectedFiles[0]);
    }
    e.currentTarget.value = '';
  };

  const removeFile = () => {
    setFile(null);
    setPassword('');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleProtect = async () => {
    if (!file) {
      toast({
        title: 'Error',
        description: 'Please select a PDF file.',
        variant: 'destructive',
      });
      return;
    }

    if (!password || password.trim() === '') {
      toast({
        title: 'Validation',
        description: 'Password is required to protect the PDF.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('fileInput', file);
      // send same value for ownerPassword and password as backend example
      formData.append('ownerPassword', password);
      formData.append('password', password);
      formData.append('keyLength', encryption);

      const res = await fetch(`${BACKEND}/api/v1/security/add-password`, {
        method: 'POST',
        body: formData,
        // If your backend requires credentials:
        // credentials: "include",
      });

      if (!res.ok) {
        // Try to extract useful error message
        const text = await res.text().catch(() => null);
        throw new Error(text || `Server returned ${res.status}`);
      }

      const blob = await res.blob();

      // Determine filename from response header or fallback to original name
      const cd =
        res.headers.get('Content-Disposition') ||
        res.headers.get('content-disposition');
      const fallback = file.name.replace(/\.pdf$/i, '_passworded.pdf');
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
        title: 'Protected',
        description: 'PDF protected and downloaded.',
      });
    } catch (err: any) {
      console.error('Protect PDF error:', err);
      toast({
        title: 'Error',
        description:
          err instanceof Error ? err.message : 'Failed to protect PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Breadcrumb items={[{ label: 'Protect PDF', href: '#' }]} />

        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Protect PDF</h1>
            <p className="text-muted-foreground">
              Add password protection to your PDF files
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="space-y-6">
          {/* File Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle>Upload PDF File</CardTitle>
              <CardDescription>
                Select or drag and drop a PDF file to protect
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-md p-12 text-center transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  Drag and drop file here
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
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Selected File</h4>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={removeFile}
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Protection Settings Card - Only shown when file is uploaded */}
          {file && (
            <Card>
              <CardHeader>
                <CardTitle>Protection Settings</CardTitle>
                <CardDescription>
                  Configure password and encryption level
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative max-w-md">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password to protect PDF"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      data-testid="input-password"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This password will be required to open the PDF file
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="encryption">Encryption Level</Label>
                  <Select
                    value={encryption}
                    onValueChange={(value: '128' | '256') =>
                      setEncryption(value)
                    }
                  >
                    <SelectTrigger id="encryption">
                      <SelectValue placeholder="Select encryption level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="128">128-bit (Standard)</SelectItem>
                      <SelectItem value="256">
                        256-bit (High Security)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Higher encryption provides better security
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons - Only shown when file is uploaded */}
          {file && (
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={handleProtect}
                disabled={isProcessing || !password}
                data-testid="button-protect"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Protecting...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Protect PDF
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={removeFile}
                disabled={isProcessing}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
