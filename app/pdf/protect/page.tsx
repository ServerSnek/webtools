'use client';

import PDFTool from '@/components/PDFTool';

export default function ProtectPDF() {
  return (
    <PDFTool
      title="Protect PDF"
      description="Add password protection"
      acceptMultiple={false}
      actionButtonText="Protect PDF"
    />
  );
}
