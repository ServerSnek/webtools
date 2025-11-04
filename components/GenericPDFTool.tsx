"use client";

import { useRoute } from "wouter";
import PDFTool from "./PDFTool";

export default function GenericPDFTool() {
  const [, params] = useRoute("/pdf/:toolName");
  
  const toolName = params?.toolName || "";
  
  const toolConfig: Record<string, { 
    title: string; 
    description: string; 
    acceptMultiple: boolean;
    acceptedFileTypes?: string;
    fileTypeFilter?: string;
    uploadLabel?: string;
  }> = {
    "pdf-to-word": { title: "PDF to Word", description: "Convert PDF to editable Word document", acceptMultiple: false },
    "pdf-to-excel": { title: "PDF to Excel", description: "Extract tables to Excel spreadsheet", acceptMultiple: false },
    "pdf-to-ppt": { title: "PDF to PowerPoint", description: "Convert PDF to PowerPoint presentation", acceptMultiple: false },
    "pdf-to-jpg": { title: "PDF to JPG", description: "Convert PDF pages to images", acceptMultiple: false },
    "word-to-pdf": { 
      title: "Word to PDF", 
      description: "Convert Word documents to PDF", 
      acceptMultiple: false,
      acceptedFileTypes: ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileTypeFilter: "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      uploadLabel: "Word"
    },
    "excel-to-pdf": { 
      title: "Excel to PDF", 
      description: "Convert Excel spreadsheets to PDF", 
      acceptMultiple: false,
      acceptedFileTypes: ".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileTypeFilter: "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      uploadLabel: "Excel"
    },
    "ppt-to-pdf": { 
      title: "PowerPoint to PDF", 
      description: "Convert presentations to PDF", 
      acceptMultiple: false,
      acceptedFileTypes: ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
      fileTypeFilter: "application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
      uploadLabel: "PowerPoint"
    },
    "jpg-to-pdf": { 
      title: "JPG to PDF", 
      description: "Convert images to PDF", 
      acceptMultiple: true,
      acceptedFileTypes: ".jpg,.jpeg,.png,image/jpeg,image/png",
      fileTypeFilter: "image/jpeg,image/png",
      uploadLabel: "Image"
    },
    "rotate": { title: "Rotate PDF", description: "Rotate PDF pages", acceptMultiple: false },
    "extract": { title: "Extract Pages", description: "Extract specific pages", acceptMultiple: false },
    "repair": { title: "Repair PDF", description: "Fix corrupted PDF files", acceptMultiple: false },
    "unlock": { title: "Unlock PDF", description: "Remove PDF password", acceptMultiple: false },
    "watermark": { title: "Watermark PDF", description: "Add watermark to pages", acceptMultiple: false },
    "sign": { title: "Sign PDF", description: "Add digital signature", acceptMultiple: false },
    "ocr": { title: "OCR PDF", description: "Extract text from scanned PDFs", acceptMultiple: false },
    "page-numbers": { title: "Page Numbers", description: "Add page numbers to PDF", acceptMultiple: false },
  };
  
  const config = toolConfig[toolName] || { 
    title: "PDF Tool", 
    description: "Process your PDF file",
    acceptMultiple: false 
  };
  
  return (
    <PDFTool
      title={config.title}
      description={config.description}
      acceptMultiple={config.acceptMultiple}
      actionButtonText={`Process ${config.title}`}
      acceptedFileTypes={config.acceptedFileTypes}
      fileTypeFilter={config.fileTypeFilter}
      uploadLabel={config.uploadLabel || "PDF"}
    />
  );
}
