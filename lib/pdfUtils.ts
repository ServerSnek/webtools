import { PDFDocument, degrees, rgb } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as XLSX from 'xlsx';

let pdfjsLib: any = null;

export type CompressOptions = {
  optimizeLevel?: number | string;
  expectedOutputSize?: string; // e.g. "100KB"
  // add any other server params here
};

export async function getPdfJs() {
  if (typeof window === 'undefined') {
    throw new Error('getPdfJs can only be called on the client side');
  }

  // Wait for the globally loaded PDF.js from CDN
  let attempts = 0;
  while (attempts < 50) {
    // @ts-ignore
    if (window.pdfjsLib) {
      // @ts-ignore
      pdfjsLib = window.pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
      return pdfjsLib;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    attempts++;
  }

  throw new Error('PDF.js library failed to load from CDN');
}

export async function imageToPDF(files: File[]): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    let image;

    if (file.type === 'image/png') {
      image = await pdfDoc.embedPng(arrayBuffer);
    } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
      image = await pdfDoc.embedJpg(arrayBuffer);
    } else {
      continue; // Skip unsupported formats
    }

    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export async function mergePDFs(files: File[]): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const pdfBytes = await mergedPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export async function splitPDF(
  file: File,
  pageNumbers: number[]
): Promise<{ blob: Blob; extractedCount: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();
  const totalPages = pdf.getPageCount();

  const invalidPages = pageNumbers.filter((num) => num > totalPages);
  if (invalidPages.length > 0) {
    throw new Error(
      `Invalid page number(s): ${invalidPages.join(
        ', '
      )}. Document has ${totalPages} page(s).`
    );
  }

  for (const pageNum of pageNumbers) {
    const [copiedPage] = await newPdf.copyPages(pdf, [pageNum - 1]);
    newPdf.addPage(copiedPage);
  }

  const pdfBytes = await newPdf.save();
  return {
    blob: new Blob([pdfBytes], { type: 'application/pdf' }),
    extractedCount: pageNumbers.length,
  };
}

export async function rotatePDF(
  file: File,
  rotation: 90 | 180 | 270
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const pages = pdf.getPages();

  pages.forEach((page) => {
    const currentRotation = page.getRotation().angle;
    const newRotation = (currentRotation + rotation) % 360;
    page.setRotation(degrees(newRotation));
  });

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export async function pdfToDocx(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjs = await getPdfJs();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const paragraphs: Paragraph[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group text items by Y coordinate (vertical position) to detect lines
    const lines: Map<number, any[]> = new Map();

    textContent.items.forEach((item: any) => {
      const y = Math.round(item.transform[5]); // Y coordinate
      if (!lines.has(y)) {
        lines.set(y, []);
      }
      lines.get(y)!.push(item);
    });

    // Sort lines by Y coordinate (top to bottom)
    const sortedLines = Array.from(lines.entries()).sort((a, b) => b[0] - a[0]);

    // Group lines into paragraphs based on vertical spacing
    let currentParagraphLines: string[] = [];
    let previousY: number | null = null;

    sortedLines.forEach(([y, items], index) => {
      // Sort items by X coordinate (left to right)
      items.sort((a, b) => a.transform[4] - b.transform[4]);

      const lineText = items
        .map((item) => item.str)
        .join(' ')
        .trim();

      if (!lineText) return;

      // Calculate gap from previous line
      const gap = previousY !== null ? previousY - y : 0;

      // If gap is large (>20px) or first line, start new paragraph
      if (gap > 20 || previousY === null) {
        // Save previous paragraph if it exists
        if (currentParagraphLines.length > 0) {
          const paragraphText = currentParagraphLines.join(' ');
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: paragraphText,
                  size: 22, // 11pt
                }),
              ],
              spacing: {
                after: 200, // Space after paragraph
                line: 276, // 1.15 line spacing
              },
            })
          );

          // Add blank lines for spacing (like ilovepdf)
          paragraphs.push(new Paragraph({ text: '' }));
          paragraphs.push(new Paragraph({ text: '' }));
        }

        // Start new paragraph
        currentParagraphLines = [lineText];
      } else {
        // Add to current paragraph
        currentParagraphLines.push(lineText);
      }

      previousY = y;

      // Handle last line
      if (
        index === sortedLines.length - 1 &&
        currentParagraphLines.length > 0
      ) {
        const paragraphText = currentParagraphLines.join(' ');
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: paragraphText,
                size: 22, // 11pt
              }),
            ],
            spacing: {
              after: 200,
              line: 276,
            },
          })
        );
      }
    });

    // Add spacing at end of page
    if (pageNum < pdf.numPages) {
      paragraphs.push(new Paragraph({ text: '' }));
      paragraphs.push(new Paragraph({ text: '' }));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children:
          paragraphs.length > 0
            ? paragraphs
            : [
                new Paragraph({
                  children: [new TextRun('No text content found in PDF')],
                }),
              ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}

// Helper function to detect column boundaries from X coordinates
function detectColumnBoundaries(xPositions: number[]): number[] {
  if (xPositions.length === 0) return [];
  if (xPositions.length === 1) return [xPositions[0]];

  // Sort X positions
  const sorted = [...xPositions].sort((a, b) => a - b);

  // Find gaps between positions
  const gaps: { position: number; size: number }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap > 5) {
      // Minimum gap of 5 to be considered a boundary
      gaps.push({ position: sorted[i - 1], size: gap });
    }
  }

  if (gaps.length === 0) return [sorted[0]];

  // Use adaptive threshold: median gap size or 20% of max gap
  const gapSizes = gaps.map((g) => g.size).sort((a, b) => a - b);
  const medianGap = gapSizes[Math.floor(gapSizes.length / 2)];
  const threshold = Math.max(medianGap * 0.5, 10); // At least 10px gap

  // Column boundaries are positions before significant gaps
  const boundaries = [sorted[0]];
  gaps.forEach((gap) => {
    if (gap.size >= threshold) {
      const boundaryX = gap.position + gap.size;
      // Include all column boundaries, even the last one
      boundaries.push(boundaryX);
    }
  });

  return boundaries.sort((a, b) => a - b);
}

export async function pdfToExcel(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjs = await getPdfJs();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const allRows: any[][] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Add page header
    if (pageNum > 1) {
      allRows.push([]); // Empty row between pages
    }
    allRows.push([`Page ${pageNum}`]);
    allRows.push([]); // Empty row after header

    // Group text items by Y coordinate to detect rows
    const rows: Map<number, any[]> = new Map();

    textContent.items.forEach((item: any) => {
      const y = Math.round(item.transform[5]);
      if (!rows.has(y)) {
        rows.set(y, []);
      }
      rows.get(y)!.push(item);
    });

    // First, merge adjacent items globally to avoid splitting multi-word cells
    const allItems = ([...textContent.items] as any[]).sort((a, b) => {
      const yDiff = Math.round(b.transform[5] - a.transform[5]);
      if (Math.abs(yDiff) < 5) {
        return a.transform[4] - b.transform[4]; // Same row, sort by X
      }
      return yDiff; // Different rows, sort by Y
    });

    const mergedCellPositions: number[] = [];
    let prevItem: any = null;

    allItems.forEach((item: any) => {
      if (!prevItem) {
        mergedCellPositions.push(item.transform[4]);
        prevItem = item;
      } else {
        const sameRow =
          Math.abs(
            Math.round(item.transform[5]) - Math.round(prevItem.transform[5])
          ) < 5;
        const gap =
          item.transform[4] - (prevItem.transform[4] + (prevItem.width || 0));

        // Only create new cell position if different row OR significant gap
        if (!sameRow || gap >= 15) {
          mergedCellPositions.push(item.transform[4]);
        }
        prevItem = item;
      }
    });

    // Detect global column boundaries from merged cell positions
    const globalColumnBoundaries = detectColumnBoundaries(mergedCellPositions);

    // Sort rows by Y coordinate (top to bottom)
    const sortedRows = Array.from(rows.entries()).sort((a, b) => b[0] - a[0]);

    // Convert each row using global column boundaries
    sortedRows.forEach(([y, items]) => {
      // Sort items by X coordinate (left to right)
      items.sort((a, b) => a.transform[4] - b.transform[4]);

      // Merge adjacent items (items very close together are part of same cell)
      const mergedItems: any[] = [];
      let currentGroup: any[] = [];

      items.forEach((item, index) => {
        if (index === 0) {
          currentGroup.push(item);
        } else {
          const prevItem = items[index - 1];
          const gap =
            item.transform[4] - (prevItem.transform[4] + (prevItem.width || 0));

          // If gap is very small (< 10px), merge with previous item
          if (gap < 10) {
            currentGroup.push(item);
          } else {
            // Save previous group and start new one
            if (currentGroup.length > 0) {
              mergedItems.push({
                x: currentGroup[0].transform[4],
                text: currentGroup.map((i) => i.str).join(' '),
              });
            }
            currentGroup = [item];
          }
        }
      });

      // Don't forget last group
      if (currentGroup.length > 0) {
        mergedItems.push({
          x: currentGroup[0].transform[4],
          text: currentGroup.map((i) => i.str).join(' '),
        });
      }

      // Create row with proper number of columns (fill empty cells)
      const rowData: string[] = new Array(globalColumnBoundaries.length).fill(
        ''
      );

      mergedItems.forEach((item) => {
        // Find which column this merged item belongs to
        let columnIndex = 0;
        for (let i = 0; i < globalColumnBoundaries.length; i++) {
          if (item.x >= globalColumnBoundaries[i]) {
            columnIndex = i;
          }
        }

        // Concatenate to existing cell text (in case multiple items map to same column)
        rowData[columnIndex] = rowData[columnIndex]
          ? rowData[columnIndex] + ' ' + item.text
          : item.text;
      });

      // Only add row if it has some content
      if (rowData.some((cell) => cell.trim())) {
        allRows.push(rowData.map((cell) => cell.trim()));
      }
    });
  }

  // Create workbook and worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(allRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PDF Content');

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
