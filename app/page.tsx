"use client";

import { Header } from "@/components/Header";
import { CategorySection } from "@/components/CategorySection";
import { 
  FileText, 
  Palette, 
  Keyboard,
  FileSpreadsheet,
  Image,
  Presentation,
  Combine,
  Scissors,
  RotateCw,
  FileOutput,
  Minimize2,
  Wrench,
  Lock,
  LockOpen,
  Droplet,
  PenTool,
  ScanText,
  Hash,
  FileEdit
} from "lucide-react";

const conversionTools = [
  { id: "pdf-to-word", name: "PDF to Word", path: "/pdf/pdf-to-word", icon: FileText },
  { id: "pdf-to-excel", name: "PDF to Excel", path: "/pdf/pdf-to-excel", icon: FileSpreadsheet },
  { id: "pdf-to-ppt", name: "PDF to PowerPoint", path: "/pdf/pdf-to-ppt", icon: Presentation },
  { id: "word-to-pdf", name: "Word to PDF", path: "/pdf/word-to-pdf", icon: FileText },
  { id: "excel-to-pdf", name: "Excel to PDF", path: "/pdf/excel-to-pdf", icon: FileSpreadsheet },
  { id: "ppt-to-pdf", name: "PowerPoint to PDF", path: "/pdf/ppt-to-pdf", icon: Presentation },
  { id: "jpg-to-pdf", name: "JPG to PDF", path: "/pdf/jpg-to-pdf", icon: Image },
  { id: "pdf-to-jpg", name: "PDF to JPG", path: "/pdf/pdf-to-jpg", icon: Image },
];

const organizationTools = [
  { id: "merge", name: "Merge PDF", path: "/pdf/merge", icon: Combine },
  { id: "split", name: "Split PDF", path: "/pdf/split", icon: Scissors },
  { id: "rotate", name: "Rotate PDF", path: "/pdf/rotate", icon: RotateCw },
  { id: "extract", name: "Extract Pages", path: "/pdf/extract", icon: FileOutput },
];

const optimizationTools = [
  { id: "compress", name: "Compress PDF", path: "/pdf/compress", icon: Minimize2 },
  { id: "repair", name: "Repair PDF", path: "/pdf/repair", icon: Wrench },
];

const securityTools = [
  { id: "protect", name: "Protect PDF", path: "/pdf/protect", icon: Lock },
  { id: "unlock", name: "Unlock PDF", path: "/pdf/unlock", icon: LockOpen },
];

const editingTools = [
  { id: "edit", name: "Edit PDF", path: "/pdf/edit", icon: FileEdit },
  { id: "watermark", name: "Add Watermark", path: "/pdf/watermark", icon: Droplet },
  { id: "sign", name: "Sign PDF", path: "/pdf/sign", icon: PenTool },
  { id: "ocr", name: "PDF OCR", path: "/pdf/ocr", icon: ScanText },
  { id: "page-numbers", name: "Page Numbers", path: "/pdf/page-numbers", icon: Hash },
];

const additionalTools = [
  { id: "css-tools", name: "CSS Tools", path: "/css-tools", icon: Palette },
  { id: "typing-test", name: "Typing Test", path: "/typing-test", icon: Keyboard },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            iEditOnline
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your comprehensive toolkit for PDF manipulation, CSS development, and productivity tools
          </p>
        </div>

        <div className="space-y-12">
          <CategorySection
            title="Conversion Tools"
            tools={conversionTools}
          />
          
          <CategorySection
            title="Organization Tools"
            tools={organizationTools}
          />
          
          <CategorySection
            title="Optimization Tools"
            tools={optimizationTools}
          />
          
          <CategorySection
            title="Security Tools"
            tools={securityTools}
          />
          
          <CategorySection
            title="Editing Tools"
            tools={editingTools}
          />
          
          <CategorySection
            title="Additional Tools"
            tools={additionalTools}
          />
        </div>
      </main>
    </div>
  );
}
