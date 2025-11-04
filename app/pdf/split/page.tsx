"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, ArrowLeft, Loader2, Scissors } from "lucide-react";
import { splitPDF } from "@/lib/pdfUtils";
import { useToast } from "@/hooks/use-toast";
import PDFPreview from "@/components/PDFPreview";
import { getPdfPageCount, clearPdfCacheForFile } from "@/hooks/usePdfDocument";

export default function SplitPDF() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file) {
      loadPDFInfo();
    }
  }, [file]);

  const loadPDFInfo = async () => {
    if (!file) return;

    try {
      const numPages = await getPdfPageCount(file);
      setPageCount(numPages);
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast({
        title: "Error",
        description: "Failed to load PDF information",
        variant: "destructive",
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
      (file) => file.type === "application/pdf"
    );

    if (droppedFiles.length > 0) {
      // Clear cache for old file before replacing
      if (file) {
        clearPdfCacheForFile(file);
      }
      setFile(droppedFiles[0]);
      setSelectedPages(new Set());
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      // Clear cache for old file before replacing
      if (file) {
        clearPdfCacheForFile(file);
      }
      setFile(selectedFiles[0]);
      setSelectedPages(new Set());
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearFile = () => {
    if (file) {
      clearPdfCacheForFile(file);
    }
    setFile(null);
    setPageCount(0);
    setSelectedPages(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const togglePage = (pageNum: number) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(pageNum)) {
      newSelected.delete(pageNum);
    } else {
      newSelected.add(pageNum);
    }
    setSelectedPages(newSelected);
  };

  const selectAll = () => {
    const allPages = new Set<number>();
    for (let i = 1; i <= pageCount; i++) {
      allPages.add(i);
    }
    setSelectedPages(allPages);
  };

  const deselectAll = () => {
    setSelectedPages(new Set());
  };

  const handleSplit = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a PDF file",
        variant: "destructive",
      });
      return;
    }

    if (selectedPages.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one page",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const pages = Array.from(selectedPages).sort((a, b) => a - b);
      const { blob, extractedCount } = await splitPDF(file, pages);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `split-pages-${pages.join('-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: `Successfully extracted ${extractedCount} page(s)`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to split PDF. Please try again.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Breadcrumb items={[{ label: "Split PDF", href: "#" }]} />

        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Split PDF</h1>
            <p className="text-muted-foreground">Extract specific pages from PDF</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload PDF File</CardTitle>
              <CardDescription>
                Select a PDF file to extract pages from
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-md p-12 text-center transition-colors ${
                  isDragging ? "border-primary bg-primary/5" : "border-border"
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

              {file && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Selected File</h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearFile}
                      data-testid="button-remove-file"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="font-medium truncate" data-testid="file-name">
                      {file.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)} • {pageCount} page{pageCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {file && pageCount > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Select Pages</CardTitle>
                    <CardDescription>
                      Choose pages to extract ({selectedPages.size} selected)
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={selectAll}
                      disabled={selectedPages.size === pageCount}
                    >
                      Select All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={deselectAll}
                      disabled={selectedPages.size === 0}
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {pageCount > 20 && (
                  <div className="mb-4 p-3 bg-muted rounded-md text-sm">
                    <p className="font-medium">Large document detected ({pageCount} pages)</p>
                    <p className="text-muted-foreground">Showing preview for first 20 pages only. Select pages below.</p>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: Math.min(pageCount, 20) }, (_, i) => i + 1).map((pageNum) => (
                    <div
                      key={pageNum}
                      className={`relative group cursor-pointer border-2 rounded-md p-2 transition-all ${
                        selectedPages.has(pageNum)
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => togglePage(pageNum)}
                      data-testid={`page-item-${pageNum}`}
                    >
                      <div className="absolute top-2 right-2 z-10">
                        <Checkbox
                          checked={selectedPages.has(pageNum)}
                          onCheckedChange={() => togglePage(pageNum)}
                          className="bg-background"
                        />
                      </div>
                      <div className="mb-2">
                        <PDFPreview 
                          file={file} 
                          pageNumber={pageNum}
                          width={150} 
                          height={180}
                          className="mx-auto"
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium">Page {pageNum}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {pageCount > 20 && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-2">Select pages by number:</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Enter page numbers or ranges (e.g., "21-30,45,50-55" for pages beyond preview)
                    </p>
                    <Input
                      placeholder="e.g., 1,5,10-15,20"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.currentTarget.value;
                          const parts = input.split(',').map(p => p.trim());
                          const newSelected = new Set(selectedPages);
                          
                          parts.forEach(part => {
                            if (part.includes('-')) {
                              const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                              if (!isNaN(start) && !isNaN(end) && start > 0 && end <= pageCount && start <= end) {
                                for (let i = start; i <= end; i++) {
                                  newSelected.add(i);
                                }
                              }
                            } else {
                              const num = parseInt(part);
                              if (!isNaN(num) && num > 0 && num <= pageCount) {
                                newSelected.add(num);
                              }
                            }
                          });
                          
                          setSelectedPages(newSelected);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {file && selectedPages.size > 0 && (
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={handleSplit}
                disabled={isProcessing}
                data-testid="button-split"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Scissors className="h-4 w-4 mr-2" />
                    Extract {selectedPages.size} Page{selectedPages.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  clearFile();
                }}
                disabled={isProcessing}
                data-testid="button-clear"
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
