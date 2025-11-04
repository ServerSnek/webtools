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
import {
  Upload,
  FileText,
  X,
  ArrowLeft,
  Download,
  Loader2,
} from 'lucide-react';

interface PDFToolProps {
  title: string;
  description: string;
  acceptMultiple?: boolean;
  actionButtonText?: string;
  onProcess?: (files: File[]) => Promise<void>;
  acceptedFileTypes?: string;
  fileTypeFilter?: string;
  uploadLabel?: string;
  // added optional callback to expose selected files to parent
  onFilesChange?: (files: File[]) => void;
}

export default function PDFTool({
  title,
  description,
  acceptMultiple = false,
  actionButtonText = 'Process Files',
  onProcess,
  acceptedFileTypes = '.pdf,application/pdf',
  fileTypeFilter = 'application/pdf',
  uploadLabel = 'PDF',
  onFilesChange,
}: PDFToolProps) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
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

    const allowedTypes = fileTypeFilter.split(',');
    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
      allowedTypes.includes(file.type)
    );

    let newFiles: File[] = [];
    if (acceptMultiple) {
      newFiles = [...files, ...droppedFiles];
    } else if (droppedFiles.length > 0) {
      newFiles = [droppedFiles[0]];
    } else {
      newFiles = files;
    }

    setFiles(newFiles);
    onFilesChange?.(newFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    let newFiles: File[] = [];
    if (acceptMultiple) {
      newFiles = [...files, ...selectedFiles];
    } else if (selectedFiles.length > 0) {
      newFiles = [selectedFiles[0]];
    } else {
      newFiles = files;
    }

    setFiles(newFiles);
    onFilesChange?.(newFiles);
    // reset input so same file can be selected again if needed
    e.currentTarget.value = '';
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesChange?.(newFiles);
  };

  const clearAll = () => {
    setFiles([]);
    onFilesChange?.([]);
  };

  const handleProcess = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    try {
      if (onProcess) {
        await onProcess(files);
      } else {
        console.log(`Processing ${files.length} file(s) for: ${title}`);
      }
    } catch (error) {
      console.error('Error processing files:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Breadcrumb items={[{ label: title, href: '#' }]} />

        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
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

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                Upload {uploadLabel} {acceptMultiple ? 'Files' : 'File'}
              </CardTitle>
              <CardDescription>
                {acceptMultiple
                  ? `Select or drag and drop multiple ${uploadLabel} files to upload`
                  : `Select or drag and drop a ${uploadLabel} file to upload`}
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
                data-testid="dropzone-pdf"
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  Drag and drop {acceptMultiple ? 'files' : 'file'} here
                </h3>
                <p className="text-sm text-muted-foreground mb-4">or</p>
                <label>
                  <input
                    type="file"
                    accept={acceptedFileTypes}
                    multiple={acceptMultiple}
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-file"
                  />
                  <Button variant="outline" asChild>
                    <span>Browse Files</span>
                  </Button>
                </label>
              </div>

              {files.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="font-medium">
                    Selected Files ({files.length})
                  </h4>
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-md"
                      data-testid={`file-item-${index}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-medium truncate"
                            data-testid={`file-name-${index}`}
                          >
                            {file.name}
                          </p>
                          <p
                            className="text-sm text-muted-foreground"
                            data-testid={`file-size-${index}`}
                          >
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFile(index)}
                        data-testid={`button-remove-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {files.length > 0 && (
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={handleProcess}
                disabled={isProcessing}
                data-testid="button-process"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    {actionButtonText}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={clearAll}
                disabled={isProcessing}
                data-testid="button-clear"
              >
                Clear All
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
