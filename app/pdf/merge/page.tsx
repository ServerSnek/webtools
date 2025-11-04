"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, ArrowLeft, Download, Loader2, X, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mergePDFs } from "@/lib/pdfUtils";
import PDFPreview from "@/components/PDFPreview";
import { clearPdfCacheForFile } from "@/hooks/usePdfDocument";

export default function MergePDF() {
  const router = useRouter();
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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
    
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    const fileToRemove = files[index];
    if (fileToRemove) {
      clearPdfCacheForFile(fileToRemove);
    }
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleItemDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (draggedIndex === null || draggedIndex === index) return;

    const newFiles = [...files];
    const draggedFile = newFiles[draggedIndex];
    newFiles.splice(draggedIndex, 1);
    newFiles.splice(index, 0, draggedFile);

    setFiles(newFiles);
    setDraggedIndex(index);
  };

  const handleItemDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      toast({
        title: "Error",
        description: "Please select at least 2 PDF files to merge",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const mergedBlob = await mergePDFs(files);
      const url = window.URL.createObjectURL(mergedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'merged.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: `Successfully merged ${files.length} PDFs`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to merge PDFs. Please try again.",
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
        <Breadcrumb items={[{ label: "Merge PDF", href: "#" }]} />

        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Merge PDF</h1>
            <p className="text-muted-foreground">Combine multiple PDFs into one document</p>
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
              <CardTitle>Upload PDF Files</CardTitle>
              <CardDescription>
                Select or drag and drop multiple PDF files to merge
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
                  Drag and drop PDF files here
                </h3>
                <p className="text-sm text-muted-foreground mb-4">or</p>
                <label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-file"
                  />
                  <Button variant="outline" asChild>
                    <span>Browse Files</span>
                  </Button>
                </label>
              </div>
            </CardContent>
          </Card>

          {files.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>PDF Files ({files.length})</CardTitle>
                  <CardDescription>
                    Drag files to reorder them. The merged PDF will follow this sequence.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        draggable
                        onDragStart={(e) => handleItemDragStart(e, index)}
                        onDragOver={(e) => handleItemDragOver(e, index)}
                        onDragEnd={handleItemDragEnd}
                        className={`relative group cursor-move border-2 rounded-md p-2 transition-all ${
                          draggedIndex === index 
                            ? "border-primary bg-primary/5 scale-105" 
                            : "border-border hover:border-primary/50"
                        }`}
                        data-testid={`pdf-item-${index}`}
                      >
                        <div className="absolute top-1 left-1 z-10 bg-background/80 rounded p-1">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="absolute top-1 right-1 z-10">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => removeFile(index)}
                            data-testid={`button-remove-${index}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="mb-2">
                          <PDFPreview 
                            file={file} 
                            width={150} 
                            height={180}
                            className="mx-auto"
                          />
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 bg-background/90 rounded px-2 py-1">
                          <p className="text-xs font-medium truncate" data-testid={`file-name-${index}`}>
                            {index + 1}. {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button 
                  className="flex-1" 
                  onClick={handleMerge}
                  disabled={isProcessing || files.length < 2}
                  data-testid="button-merge"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Merging...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Merge {files.length} PDFs
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setFiles([])}
                  disabled={isProcessing}
                  data-testid="button-clear"
                >
                  Clear All
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
