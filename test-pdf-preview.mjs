import { PDFDocument, StandardFonts } from 'pdf-lib';
import { writeFileSync } from 'fs';

async function createTestPDF() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 400]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  page.drawText('Test PDF Document', {
    x: 50,
    y: 350,
    size: 30,
    font,
  });
  
  page.drawText('This is a test PDF for preview functionality', {
    x: 50,
    y: 300,
    size: 16,
    font,
  });
  
  const pdfBytes = await pdfDoc.save();
  writeFileSync('public/test.pdf', pdfBytes);
  console.log('Test PDF created at public/test.pdf');
}

createTestPDF();
