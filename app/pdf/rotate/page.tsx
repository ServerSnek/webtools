"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, X, ArrowLeft, RotateCw, Loader2 } from "lucide-react";
import { rotatePDF } from "@/lib/pdfUtils";
import { useToast } from "@/hooks/use-toast";
import PDFPreview from "@/components/PDFPreview";
import { clearPdfCacheForFile } from "@/hooks/usePdfDocument";

export default function RotatePDF() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState<"90" | "180" | "270">("90");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRotate = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a PDF file",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const rotatedBlob = await rotatePDF(file, parseInt(rotation) as 90 | 180 | 270);
      
      const url = window.URL.createObjectURL(rotatedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rotated-${rotation}deg.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: `Successfully rotated PDF by ${rotation}°`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rotate PDF. Please try again.",
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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Breadcrumb items={[{ label: "Rotate PDF", href: "#" }]} />

        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Rotate PDF</h1>
            <p className="text-muted-foreground">Rotate all pages in your PDF</p>
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
                Select a PDF file to rotate
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
                  <div className="flex items-center justify-between mb-3">
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
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <PDFPreview 
                        file={file} 
                        pageNumber={1}
                        width={120} 
                        height={150}
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="font-medium truncate" data-testid="file-name">
                        {file.name}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid="file-size">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {file && (
            <Card>
              <CardHeader>
                <CardTitle>Rotation Angle</CardTitle>
                <CardDescription>
                  Select the rotation angle for all pages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <RadioGroup value={rotation} onValueChange={(value) => setRotation(value as "90" | "180" | "270")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="90" id="r90" data-testid="radio-90" />
                      <Label htmlFor="r90" className="cursor-pointer">90° clockwise</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="180" id="r180" data-testid="radio-180" />
                      <Label htmlFor="r180" className="cursor-pointer">180°</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="270" id="r270" data-testid="radio-270" />
                      <Label htmlFor="r270" className="cursor-pointer">270° clockwise (90° counter-clockwise)</Label>
                    </div>
                  </RadioGroup>

                  <div className="flex gap-3 pt-2">
                    <Button
                      className="flex-1"
                      onClick={handleRotate}
                      disabled={isProcessing}
                      data-testid="button-rotate"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <RotateCw className="h-4 w-4 mr-2" />
                          Rotate PDF
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={clearFile}
                      disabled={isProcessing}
                      data-testid="button-clear"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
