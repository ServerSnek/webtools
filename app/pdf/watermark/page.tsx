'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

// after
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

// Small util: hex → [0..1] rgb
const hexToRgb01 = (hex: string) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 0.2, g: 0.2, b: 0.2 };
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  return { r, g, b };
};

type FontKey = 'Helvetica' | 'TimesRoman' | 'Courier';

export default function PDFWatermarkTool() {
  const [file, setFile] = useState<File | null>(null);

  // Controls
  const [wmType] = useState<'Text'>('Text'); // extend if you add image watermark
  const [alphabet, setAlphabet] = useState<FontKey>('TimesRoman'); // "Roman" ≈ Times
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(30);
  const [opacity, setOpacity] = useState(50); // 0..100
  const [rotation, setRotation] = useState(45);
  const [wSpacer, setWSpacer] = useState(10);
  const [hSpacer, setHSpacer] = useState(100);
  const [color, setColor] = useState('#7a2020');
  const [pdfToImage, setPdfToImage] = useState(false);

  // Preview canvases
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Lazy-load pdf.js for the browser
  const pdfjs = useMemo(() => ({ lib: null as any }), []);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const pdfjsLib = await import('pdfjs-dist');
      // Worker setup that works in Next.js
      const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs');
      // @ts-ignore
      pdfjsLib.GlobalWorkerOptions.workerSrc = worker;
      if (mounted) pdfjs.lib = pdfjsLib;
    })();
    return () => {
      mounted = false;
    };
  }, [pdfjs]);

  // Render preview of page 1 + draw overlay
  const renderPreview = async () => {
    if (!file || !pdfjs.lib) return;
    const pdfBytes = await file.arrayBuffer();
    const loadingTask = pdfjs.lib.getDocument({ data: pdfBytes });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 1.25 });
    const pdfCanvas = pdfCanvasRef.current!;
    const ctx = pdfCanvas.getContext('2d')!;
    pdfCanvas.width = viewport.width;
    pdfCanvas.height = viewport.height;

    // Render base page
    await page.render({ canvasContext: ctx, viewport }).promise;

    // Size overlay identical to base
    const overlay = overlayCanvasRef.current!;
    overlay.width = pdfCanvas.width;
    overlay.height = pdfCanvas.height;

    // Draw tiled watermark on overlay
    const octx = overlay.getContext('2d')!;
    octx.clearRect(0, 0, overlay.width, overlay.height);

    if (wmType === 'Text' && text.trim()) {
      const { r, g, b } = hexToRgb01(color);
      octx.save();
      octx.globalAlpha = Math.max(0, Math.min(1, opacity / 100));
      octx.fillStyle = `rgba(${Math.round(r * 255)},${Math.round(
        g * 255
      )},${Math.round(b * 255)},1)`;
      octx.font = `${fontSize}px ${
        alphabet === 'TimesRoman' ? 'Times New Roman, Times, serif' : alphabet
      }`;
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';

      // Tiling
      const rad = (rotation * Math.PI) / 180;
      // Grid step includes text width approx; use spacer inputs
      const stepX = overlay.width / 3 + wSpacer;
      const stepY = fontSize + hSpacer;

      for (let y = -stepY; y < overlay.height + stepY; y += stepY) {
        for (let x = -stepX; x < overlay.width + stepX; x += stepX) {
          octx.save();
          octx.translate(x + stepX / 2, y + stepY / 2);
          octx.rotate(rad);
          octx.fillText(text, 0, 0);
          octx.restore();
        }
      }
      octx.restore();
    }
  };

  // Re-render preview when inputs change
  useEffect(() => {
    renderPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    file,
    text,
    fontSize,
    opacity,
    rotation,
    wSpacer,
    hSpacer,
    color,
    alphabet,
    wmType,
  ]);

  // Produce final PDF and download
  const handleProcess = async () => {
    if (!file) return;

    const inputBytes = await file.arrayBuffer();
    let outDoc: PDFDocument;

    if (pdfToImage) {
      // Rasterize each page, draw to a new PDF, then apply text tiles
      if (!pdfjs.lib) return;
      const loadingTask = pdfjs.lib.getDocument({ data: inputBytes });
      const srcPdf = await loadingTask.promise;

      outDoc = await PDFDocument.create();
      const font = await outDoc.embedFont(StandardFonts[alphabet]);

      for (let i = 1; i <= srcPdf.numPages; i++) {
        const page = await srcPdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 }); // quality
        // Render to canvas
        const tmp = document.createElement('canvas');
        tmp.width = viewport.width;
        tmp.height = viewport.height;
        await page.render({ canvasContext: tmp.getContext('2d')!, viewport })
          .promise;

        const pngBytes = await (
          await fetch(tmp.toDataURL('image/png'))
        ).arrayBuffer();
        const img = await outDoc.embedPng(pngBytes);

        const p = outDoc.addPage([viewport.width, viewport.height]);
        p.drawImage(img, {
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
        });

        // Tiled watermark text over the image
        if (text.trim()) {
          const { r, g, b } = hexToRgb01(color);
          const width = p.getWidth();
          const height = p.getHeight();
          const stepX = width / 3 + wSpacer;
          const stepY = fontSize + hSpacer;

          for (let y = -stepY; y < height + stepY; y += stepY) {
            for (let x = -stepX; x < width + stepX; x += stepX) {
              p.drawText(text, {
                x: x + stepX / 2,
                y: y + stepY / 2,
                size: fontSize,
                font,
                color: rgb(
                  hexToRgb01(color).r,
                  hexToRgb01(color).g,
                  hexToRgb01(color).b
                ),
                rotate: degrees(rotation),
                opacity: Math.max(0, Math.min(1, opacity / 100)),
              });
            }
          }
        }
      }
    } else {
      // Keep vector PDF and draw text directly
      const pdfDoc = await PDFDocument.load(inputBytes);
      const font = await pdfDoc.embedFont(StandardFonts[alphabet]);

      const { r, g, b } = hexToRgb01(color);
      for (const page of pdfDoc.getPages()) {
        const width = page.getWidth();
        const height = page.getHeight();
        const stepX = width / 3 + wSpacer;
        const stepY = fontSize + hSpacer;

        for (let y = -stepY; y < height + stepY; y += stepY) {
          for (let x = -stepX; x < width + stepX; x += stepX) {
            page.drawText(text, {
              x: x + stepX / 2,
              y: y + stepY / 2,
              size: fontSize,
              font,
              color: rgb(r, g, b),
              rotate: degrees(rotation),

              opacity: Math.max(0, Math.min(1, opacity / 100)),
            });
          }
        }
      }
      outDoc = pdfDoc;
    }

    const outBytes = await outDoc.save();
    const blob = new Blob([outBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = addSuffix(file.name, '_watermarked.pdf');
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Controls */}
      <div className="space-y-3">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <label>Watermark Type</label>
        <select value={wmType} disabled className="border p-2 rounded">
          <option>Text</option>
        </select>

        <label>Alphabet</label>
        <select
          value={alphabet}
          onChange={(e) => setAlphabet(e.target.value as FontKey)}
          className="border p-2 rounded"
        >
          <option value="TimesRoman">Roman</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Courier">Courier</option>
        </select>

        <label>Watermark Text</label>
        <input
          className="border p-2 rounded w-full"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <label>Font Size</label>
        <input
          type="number"
          className="border p-2 rounded w-full"
          value={fontSize}
          min={6}
          onChange={(e) => setFontSize(Number(e.target.value))}
        />

        <label>Opacity (0%–100%)</label>
        <input
          type="range"
          min={0}
          max={100}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
        />
        <div>{opacity}%</div>

        <label>Rotation (0–360)</label>
        <input
          type="number"
          className="border p-2 rounded w-full"
          value={rotation}
          min={0}
          max={360}
          onChange={(e) => setRotation(Number(e.target.value))}
        />

        <label>Width Spacer</label>
        <input
          type="number"
          className="border p-2 rounded w-full"
          value={wSpacer}
          min={0}
          onChange={(e) => setWSpacer(Number(e.target.value))}
        />

        <label>Height Spacer</label>
        <input
          type="number"
          className="border p-2 rounded w-full"
          value={hSpacer}
          min={0}
          onChange={(e) => setHSpacer(Number(e.target.value))}
        />

        <label>Custom Text Colour</label>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={pdfToImage}
            onChange={(e) => setPdfToImage(e.target.checked)}
          />
          Convert PDF to PDF-Image
        </label>

        <button
          className="border px-4 py-2 rounded"
          onClick={handleProcess}
          disabled={!file}
        >
          Add Watermark
        </button>
      </div>

      {/* Preview */}
      <div className="lg:col-span-2">
        <div className="relative w-full overflow-auto border rounded">
          <canvas ref={pdfCanvasRef} />
          <canvas
            ref={overlayCanvasRef}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          />
        </div>
        <p className="text-sm mt-2">
          Live preview shows page 1. Export applies to all pages.
        </p>
      </div>
    </div>
  );
}

function addSuffix(name: string, suffix: string) {
  const dot = name.lastIndexOf('.');
  if (dot === -1) return name + suffix;
  return name.slice(0, dot) + suffix;
}
