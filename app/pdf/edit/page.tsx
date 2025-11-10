'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Upload,
  ArrowLeft,
  Type,
  Pencil,
  Square,
  Circle,
  Highlighter,
  Download,
  Undo,
  Redo,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  MousePointer,
  Image as ImageIcon,
  Eraser,
  FileSignature,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { getPdfJs } from '@/lib/pdfUtils';

type Tool =
  | 'select'
  | 'text'
  | 'draw'
  | 'rectangle'
  | 'circle'
  | 'highlight'
  | 'image'
  | 'eraser'
  | 'signature';

interface Annotation {
  id: string;
  type: Tool;
  page: number;
  x: number; // page-space units (user units used by PDF backend)
  y: number; // page-space baseline
  width?: number; // page-space
  height?: number; // page-space
  text?: string;
  color?: string;
  points?: { x: number; y: number }[]; // page-space
  isReplacement?: boolean;
  fontSize?: number; // page-space font size (points)
  fontFamily?: string;
  originalWidth?: number; // page-space
  originalHeight?: number; // page-space
  imageData?: string;
}

interface ExtractedTextItem {
  str: string;
  x: number; // page-space baseline x
  y: number; // page-space baseline y
  width: number; // page-space
  height: number; // page-space
  fontSize: number; // page-space
}

export default function EditPDF() {
  const router = useRouter();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [history, setHistory] = useState<Annotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<
    { x: number; y: number }[]
  >([]);
  const [textColor, setTextColor] = useState('#000000');
  const [drawColor, setDrawColor] = useState('#000000');
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(
    null
  );
  const [editingText, setEditingText] = useState<{
    id: string;
    text: string;
    x: number; // canvas px
    y: number; // canvas px
    fontSize?: number; // canvas px
  } | null>(null);
  const [extractedText, setExtractedText] = useState<
    Map<number, ExtractedTextItem[]>
  >(new Map());
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isResizingImage, setIsResizingImage] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);

  // signature state
  const [signatureText, setSignatureText] = useState('');
  const [signatureFont, setSignatureFont] = useState(
    'Pacifico, Georgia, "Times New Roman", serif'
  );
  const [showSignatureDrawer, setShowSignatureDrawer] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // signature canvas refs
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sigLastPos = useRef<{ x: number; y: number } | null>(null);
  const [isSigDrawing, setIsSigDrawing] = useState(false);
  const [savedSignatureDataUrl, setSavedSignatureDataUrl] = useState<
    string | null
  >(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      loadPDF(selectedFile);
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please select a PDF file',
        variant: 'destructive',
      });
    }
  };

  const loadPDF = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await getPdfJs();
      const loadingTask = pdfjsLib.getDocument(new Uint8Array(arrayBuffer));
      const pdf = await loadingTask.promise;

      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      setCurrentPage(1);
      setAnnotations([]);
      setHistory([[]]);
      setHistoryIndex(0);
      setExtractedText(new Map());
      setSelectedAnnotation(null);
      setEditingText(null);

      toast({
        title: 'PDF Loaded',
        description: `Successfully loaded PDF with ${pdf.numPages} pages`,
      });
    } catch (error) {
      toast({
        title: 'Error Loading PDF',
        description: 'Failed to load PDF file',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (pdfDoc) {
      renderPage();
      extractPageText();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, currentPage, scale, annotations, selectedAnnotation]);

  useEffect(() => {
    setSelectedAnnotation(null);
    setEditingText(null);
  }, [currentPage, scale]);

  useEffect(() => {
    if (editingText && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingText]);

  const renderPage = async () => {
    if (!pdfDoc || !canvasRef.current || !annotationCanvasRef.current) return;

    // cancel previous render if active
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {}
      renderTaskRef.current = null;
    }

    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale });

    const canvas = canvasRef.current;
    const annotationCanvas = annotationCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const actx = annotationCanvas.getContext('2d');
    if (!ctx || !actx) return;

    // size canvases to PDF page rendered size
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    annotationCanvas.width = viewport.width;
    annotationCanvas.height = viewport.height;

    const renderTask = page.render({ canvasContext: ctx, viewport });
    renderTaskRef.current = renderTask;
    try {
      await renderTask.promise;
      renderTaskRef.current = null;
    } catch (err: any) {
      if (err?.name === 'RenderingCancelledException') return;
      console.error('render error', err);
      return;
    }

    // clear and draw annotations for this page
    actx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
    annotations
      .filter((a) => a.page === currentPage)
      .forEach((a) => renderAnnotation(actx, a, a.id === selectedAnnotation));
  };

  // extract and convert coordinates into page-space units
  const extractPageText = async () => {
    if (!pdfDoc || !annotationCanvasRef.current) return;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const textContent = await page.getTextContent();
      const items: ExtractedTextItem[] = [];

      // canvas ctx used only for measuring text width. measurement in canvas px.
      const ctx = annotationCanvasRef.current.getContext('2d');
      if (!ctx) return;

      // For each text item compute canvas coords via pdfjs viewport helpers,
      // then convert canvas px -> page-space by dividing by scale.
      textContent.items.forEach((item: any) => {
        if (
          !item.str ||
          !Array.isArray(item.transform) ||
          item.transform.length < 6
        )
          return;
        try {
          // transform contains tx, ty in PDF text space. Use viewport to map to canvas px.
          const tx = item.transform[4];
          const ty = item.transform[5];
          // convert to canvas pixels (viewport coords)
          const [canvasX, canvasY] = viewport.convertToViewportPoint(tx, ty);
          // approximate font height (canvas px)
          const fontHeight =
            Math.sqrt(item.transform[2] ** 2 + item.transform[3] ** 2) * scale;
          const displayFont = Math.max(8, fontHeight);
          ctx.font = `${displayFont}px Arial`;
          const metrics = ctx.measureText(item.str);
          // convert canvas px -> page-space (user units) by dividing by scale
          const pageX = canvasX / scale;
          // canvasY is top-left coordinate system of pdfjs convert; we store baseline page-space y
          const pageY = (viewport.height - canvasY) / scale;
          items.push({
            str: item.str,
            x: pageX,
            y: pageY,
            width: metrics.width / scale,
            height: displayFont / scale,
            fontSize: displayFont / scale,
          });
        } catch (e) {
          // ignore item
        }
      });

      setExtractedText((prev) => {
        const m = new Map(prev);
        m.set(currentPage, items);
        return m;
      });
    } catch (e) {
      console.error('extract error', e);
    }
  };

  const renderAnnotation = (
    ctx: CanvasRenderingContext2D,
    ann: Annotation,
    isSelected = false
  ) => {
    ctx.save();
    switch (ann.type) {
      case 'text': {
        const displayFontSize = (ann.fontSize || 12) * scale;
        const displayX = ann.x * scale;
        const displayY = ann.y * scale;
        if (ann.isReplacement && ann.originalWidth && ann.originalHeight) {
          const maskX = (ann.x - 1) * scale;
          const maskTop = (ann.y - ann.originalHeight - 2) * scale;
          const maskW = (ann.originalWidth + 4) * scale;
          const maskH = (ann.originalHeight + 6) * scale;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(maskX, maskTop, maskW, maskH);
        }
        ctx.font = `${displayFontSize}px ${ann.fontFamily || 'Arial'}`;
        ctx.fillStyle = ann.color || '#000';
        ctx.fillText(ann.text || '', displayX, displayY);
        if (isSelected) {
          const metrics = ctx.measureText(ann.text || '');
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(
            displayX - 2,
            displayY - displayFontSize,
            metrics.width,
            displayFontSize + 6
          );
          ctx.setLineDash([]);
        }
        break;
      }
      case 'rectangle': {
        ctx.strokeStyle = ann.color || '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          ann.x * scale,
          ann.y * scale,
          (ann.width || 0) * scale,
          (ann.height || 0) * scale
        );
        break;
      }
      case 'circle': {
        ctx.strokeStyle = ann.color || '#000';
        ctx.lineWidth = 2;
        const radius =
          (Math.sqrt((ann.width || 0) ** 2 + (ann.height || 0) ** 2) / 2) *
          scale;
        ctx.beginPath();
        ctx.arc(
          (ann.x + (ann.width || 0) / 2) * scale,
          (ann.y + (ann.height || 0) / 2) * scale,
          radius,
          0,
          2 * Math.PI
        );
        ctx.stroke();
        break;
      }
      case 'highlight': {
        ctx.fillStyle = (ann.color || '#FFFF00') + '40';
        ctx.fillRect(
          ann.x * scale,
          ann.y * scale,
          (ann.width || 0) * scale,
          (ann.height || 0) * scale
        );
        break;
      }
      case 'draw': {
        if (ann.points && ann.points.length > 1) {
          ctx.strokeStyle = ann.color || '#000';
          ctx.lineWidth = 2;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ann.points[0].x * scale, ann.points[0].y * scale);
          for (let i = 1; i < ann.points.length; i++)
            ctx.lineTo(ann.points[i].x * scale, ann.points[i].y * scale);
          ctx.stroke();
        }
        break;
      }
      case 'image':
      case 'signature': {
        if (ann.imageData && ann.width && ann.height) {
          const img = new Image();
          const w = ann.width * scale;
          const h = ann.height * scale;
          const x = ann.x * scale;
          const y = ann.y * scale;
          img.onload = () => {
            try {
              ctx.drawImage(img, x, y, w, h);
              if (isSelected) {
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
                ctx.setLineDash([]);
              }
            } catch (e) {}
          };
          img.src = ann.imageData;
        }
        break;
      }
    }
    ctx.restore();
  };

  const findTextAnnotationAtPoint = (
    x: number,
    y: number
  ): Annotation | null => {
    const pageTextAnnotations = annotations.filter(
      (a) => a.page === currentPage && a.type === 'text'
    );
    const ctx = annotationCanvasRef.current?.getContext('2d');
    if (!ctx) return null;
    for (let i = pageTextAnnotations.length - 1; i >= 0; i--) {
      const ann = pageTextAnnotations[i];
      const displayFontSize = (ann.fontSize || 12) * scale;
      const dx = ann.x * scale;
      const dy = ann.y * scale;
      ctx.font = `${displayFontSize}px ${ann.fontFamily || 'Arial'}`;
      const metrics = ctx.measureText(ann.text || '');
      const w = metrics.width;
      const h = displayFontSize;
      if (x >= dx - 4 && x <= dx + w + 4 && y >= dy - h - 4 && y <= dy + 6)
        return ann;
    }
    return null;
  };

  const findExtractedTextAtPoint = (
    x: number,
    y: number
  ): ExtractedTextItem | null => {
    const pageText = extractedText.get(currentPage);
    if (!pageText) return null;
    const pageX = x / scale;
    const pageY = y / scale;
    for (let i = pageText.length - 1; i >= 0; i--) {
      const it = pageText[i];
      if (
        pageX >= it.x - 0.5 &&
        pageX <= it.x + it.width + 0.5 &&
        pageY >= it.y - it.height - 0.5 &&
        pageY <= it.y + 0.5
      )
        return it;
    }
    return null;
  };

  const findAnyAnnotationAtPoint = (
    x: number,
    y: number
  ): Annotation | null => {
    const pageAnnotations = annotations.filter((a) => a.page === currentPage);
    for (let i = pageAnnotations.length - 1; i >= 0; i--) {
      const ann = pageAnnotations[i];
      if (ann.type === 'text') {
        const ta = findTextAnnotationAtPoint(x, y);
        if (ta) return ta;
      } else if (ann.width && ann.height) {
        const sx = ann.x * scale,
          sy = ann.y * scale,
          sw = ann.width * scale,
          sh = ann.height * scale;
        if (x >= sx && x <= sx + sw && y >= sy && y <= sy + sh) return ann;
      } else if (ann.points && ann.points.length) {
        const hit = 10;
        for (const p of ann.points) {
          const dx = x - p.x * scale,
            dy = y - p.y * scale;
          if (Math.sqrt(dx * dx + dy * dy) <= hit) return ann;
        }
      }
    }
    return null;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) {
      toast({
        title: 'Invalid',
        description: 'Pick image',
        variant: 'destructive',
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxW = 240,
          maxH = 160;
        let w = img.width,
          h = img.height;
        if (w > maxW) {
          h = (h * maxW) / w;
          w = maxW;
        }
        if (h > maxH) {
          w = (w * maxH) / h;
          h = maxH;
        }
        // store page-space dims
        const ann: Annotation = {
          id: `img-${Date.now()}`,
          type: 'image',
          page: currentPage,
          x: 60 / scale,
          y: 60 / scale,
          width: w / scale,
          height: h / scale,
          imageData: data,
        };
        const newAn = [...annotations, ann];
        setAnnotations(newAn);
        const nh = history.slice(0, historyIndex + 1);
        nh.push(newAn);
        setHistory(nh);
        setHistoryIndex(nh.length - 1);
        setSelectedAnnotation(ann.id);
        setActiveTool('select');
        toast({ title: 'Image Added' });
      };
      img.src = data;
    };
    reader.readAsDataURL(f);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const getResizeHandle = (x: number, y: number, ann: Annotation) => {
    if (
      (ann.type !== 'image' && ann.type !== 'signature') ||
      !ann.width ||
      !ann.height
    )
      return null;
    const sx = ann.x * scale,
      sy = ann.y * scale,
      sw = ann.width * scale,
      sh = ann.height * scale;
    const hs = 8;
    const handles = {
      nw: [sx, sy],
      ne: [sx + sw, sy],
      sw: [sx, sy + sh],
      se: [sx + sw, sy + sh],
    };
    for (const [k, v] of Object.entries(handles)) {
      if (x >= v[0] - hs && x <= v[0] + hs && y >= v[1] - hs && y <= v[1] + hs)
        return k;
    }
    return null;
  };

  // --- canvas mouse handlers ---
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = annotationCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left,
      y = e.clientY - rect.top;

    if (activeTool === 'select') {
      const selectedAnn = annotations.find(
        (a) => a.id === selectedAnnotation && a.page === currentPage
      );
      if (
        selectedAnn &&
        (selectedAnn.type === 'image' || selectedAnn.type === 'signature')
      ) {
        const handle = getResizeHandle(x, y, selectedAnn);
        if (handle) {
          setIsResizingImage(true);
          setResizeHandle(handle);
          return;
        }
        const sx = selectedAnn.x * scale,
          sy = selectedAnn.y * scale,
          sw = (selectedAnn.width || 0) * scale,
          sh = (selectedAnn.height || 0) * scale;
        if (x >= sx && x <= sx + sw && y >= sy && y <= sy + sh) {
          setIsDraggingImage(true);
          setDragOffset({ x: x - sx, y: y - sy });
          return;
        }
      }

      const clickedImage = annotations.find(
        (a) =>
          (a.type === 'image' || a.type === 'signature') &&
          a.page === currentPage &&
          a.width &&
          a.height &&
          x >= a.x * scale &&
          x <= a.x * scale + a.width * scale &&
          y >= a.y * scale &&
          y <= a.y * scale + a.height * scale
      );
      if (clickedImage) {
        setSelectedAnnotation(clickedImage.id);
        setIsDraggingImage(true);
        setDragOffset({
          x: x - clickedImage.x * scale,
          y: y - clickedImage.y * scale,
        });
        return;
      }

      const clickedAnnotation = findTextAnnotationAtPoint(x, y);
      if (clickedAnnotation) {
        setSelectedAnnotation(clickedAnnotation.id);
        const displayX = clickedAnnotation.x * scale;
        const displayY = clickedAnnotation.y * scale;
        const displayFontSize = (clickedAnnotation.fontSize || 12) * scale;
        setEditingText({
          id: clickedAnnotation.id,
          text: clickedAnnotation.text || '',
          x: displayX,
          y: displayY - displayFontSize,
          fontSize: displayFontSize,
        });
        return;
      }

      const clickedExtracted = findExtractedTextAtPoint(x, y);
      if (clickedExtracted) {
        const newAnn: Annotation = {
          id: `ex-${Date.now()}`,
          type: 'text',
          page: currentPage,
          x: clickedExtracted.x,
          y: clickedExtracted.y,
          text: clickedExtracted.str,
          color: '#000',
          isReplacement: true,
          fontSize: clickedExtracted.fontSize,
          originalWidth: clickedExtracted.width,
          originalHeight: clickedExtracted.height,
          fontFamily: 'Arial',
        };
        const newAn = [...annotations, newAnn];
        setAnnotations(newAn);
        const nh = history.slice(0, historyIndex + 1);
        nh.push(newAn);
        setHistory(nh);
        setHistoryIndex(nh.length - 1);
        setSelectedAnnotation(newAnn.id);
        setEditingText({
          id: newAnn.id,
          text: clickedExtracted.str,
          x: clickedExtracted.x * scale,
          y: clickedExtracted.y * scale - clickedExtracted.fontSize * scale,
          fontSize: clickedExtracted.fontSize * scale,
        });
        toast({
          title: 'Text Selected',
          description: 'Edit inline and press Enter or click outside to save',
        });
        return;
      }

      setSelectedAnnotation(null);
      setEditingText(null);
      return;
    }

    // other tools
    setSelectedAnnotation(null);
    setEditingText(null);

    if (activeTool === 'eraser') {
      const hit = findAnyAnnotationAtPoint(x, y);
      if (hit) {
        const newAn = annotations.filter((a) => a.id !== hit.id);
        setAnnotations(newAn);
        const nh = history.slice(0, historyIndex + 1);
        nh.push(newAn);
        setHistory(nh);
        setHistoryIndex(nh.length - 1);
        toast({ title: 'Deleted' });
      }
      return;
    }

    if (activeTool === 'image') {
      imageInputRef.current?.click();
      return;
    }
    if (activeTool === 'signature') {
      setShowSignatureDrawer(true);
      return;
    }
    if (activeTool === 'draw') {
      setIsDrawing(true);
      setCurrentPoints([{ x, y }]);
      return;
    }
    if (activeTool === 'text') {
      const ann: Annotation = {
        id: `txt-${Date.now()}`,
        type: 'text',
        page: currentPage,
        x: x / scale,
        y: y / scale,
        text: '',
        color: textColor,
        fontSize: 12,
        fontFamily: 'Arial',
      };
      const newAn = [...annotations, ann];
      setAnnotations(newAn);
      const nh = history.slice(0, historyIndex + 1);
      nh.push(newAn);
      setHistory(nh);
      setHistoryIndex(nh.length - 1);
      setSelectedAnnotation(ann.id);
      setEditingText({
        id: ann.id,
        text: '',
        x: x,
        y: y - 14,
        fontSize: 12 * scale,
      });
      return;
    }

    // fallback rectangle/circle/highlight start
    setIsDrawing(true);
    setCurrentPoints([{ x, y }]);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = annotationCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left,
      y = e.clientY - rect.top;

    if (isDraggingImage && selectedAnnotation) {
      const nx = (x - dragOffset.x) / scale,
        ny = (y - dragOffset.y) / scale;
      updateAnnotation(selectedAnnotation, { x: nx, y: ny }, false);
      return;
    }

    if (isResizingImage && selectedAnnotation && resizeHandle) {
      const ann = annotations.find((a) => a.id === selectedAnnotation);
      if (!ann || !ann.width || !ann.height) return;
      const ux = x / scale,
        uy = y / scale;
      let nx = ann.x,
        ny = ann.y,
        nw = ann.width,
        nh = ann.height;
      switch (resizeHandle) {
        case 'se':
          nw = ux - ann.x;
          nh = uy - ann.y;
          break;
        case 'sw':
          nx = ux;
          nw = ann.x + ann.width - ux;
          nh = uy - ann.y;
          break;
        case 'ne':
          ny = uy;
          nw = ux - ann.x;
          nh = ann.y + ann.height - uy;
          break;
        case 'nw':
          nx = ux;
          ny = uy;
          nw = ann.x + ann.width - ux;
          nh = ann.y + ann.height - uy;
          break;
      }
      if (nw > 8 / scale && nh > 8 / scale)
        updateAnnotation(
          selectedAnnotation,
          { x: nx, y: ny, width: nw, height: nh },
          false
        );
      return;
    }

    if (!isDrawing) return;

    if (activeTool === 'draw') {
      setCurrentPoints((prev) => [...prev, { x, y }]);
      const ctx = annotationCanvasRef.current?.getContext('2d');
      if (ctx && currentPoints.length) {
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(
          currentPoints[currentPoints.length - 1].x,
          currentPoints[currentPoints.length - 1].y
        );
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      return;
    }

    const ctx = annotationCanvasRef.current?.getContext('2d');
    if (!ctx || currentPoints.length === 0) return;
    const ac = annotationCanvasRef.current!;
    ctx.clearRect(0, 0, ac.width, ac.height);
    annotations
      .filter((a) => a.page === currentPage)
      .forEach((a) => renderAnnotation(ctx, a, a.id === selectedAnnotation));

    const sx = currentPoints[0].x,
      sy = currentPoints[0].y,
      w = x - sx,
      h = y - sy;
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 2;
    if (activeTool === 'rectangle') ctx.strokeRect(sx, sy, w, h);
    else if (activeTool === 'circle') {
      ctx.beginPath();
      const r = Math.sqrt(w * w + h * h) / 2;
      ctx.arc(sx + w / 2, sy + h / 2, r, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (activeTool === 'highlight') {
      ctx.fillStyle = drawColor + '40';
      ctx.fillRect(sx, sy, w, h);
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingImage) {
      setIsDraggingImage(false);
      const nh = history.slice(0, historyIndex + 1);
      nh.push([...annotations]);
      setHistory(nh);
      setHistoryIndex(nh.length - 1);
      return;
    }
    if (isResizingImage) {
      setIsResizingImage(false);
      setResizeHandle(null);
      const nh = history.slice(0, historyIndex + 1);
      nh.push([...annotations]);
      setHistory(nh);
      setHistoryIndex(nh.length - 1);
      return;
    }
    if (!isDrawing) return;
    const rect = annotationCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left,
      y = e.clientY - rect.top;

    if (activeTool === 'draw') {
      addAnnotation({
        type: 'draw',
        x: currentPoints[0].x / scale,
        y: currentPoints[0].y / scale,
        points: [...currentPoints, { x, y }].map((p) => ({
          x: p.x / scale,
          y: p.y / scale,
        })),
        color: drawColor,
      });
    } else if (currentPoints.length) {
      const sx = currentPoints[0].x,
        sy = currentPoints[0].y,
        ex = x,
        ey = y;
      const nx = Math.min(sx, ex),
        ny = Math.min(sy, ey),
        nw = Math.abs(ex - sx),
        nh = Math.abs(ey - sy);
      addAnnotation({
        type: activeTool,
        x: nx / scale,
        y: ny / scale,
        width: nw / scale,
        height: nh / scale,
        color: drawColor,
      });
    }

    setIsDrawing(false);
    setCurrentPoints([]);
  };

  const addAnnotation = (annotation: Omit<Annotation, 'id' | 'page'>) => {
    const newAnn: Annotation = {
      ...annotation,
      id: Date.now().toString(),
      page: currentPage,
    };
    const newAn = [...annotations, newAnn];
    setAnnotations(newAn);
    const nh = history.slice(0, historyIndex + 1);
    nh.push(newAn);
    setHistory(nh);
    setHistoryIndex(nh.length - 1);
  };

  const updateAnnotation = (
    id: string,
    updates: Partial<Annotation>,
    addHist = true
  ) => {
    const newAn = annotations.map((a) =>
      a.id === id ? { ...a, ...updates } : a
    );
    setAnnotations(newAn);
    if (addHist) {
      const nh = history.slice(0, historyIndex + 1);
      nh.push(newAn);
      setHistory(nh);
      setHistoryIndex(nh.length - 1);
    }
  };

  const handleTextEditComplete = () => {
    if (!editingText) return;
    updateAnnotation(editingText.id, { text: editingText.text });
    setEditingText(null);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
    }
  };

  // ---------- IMPORTANT: backend save flow ----------
  // Sends original PDF + annotations to backend endpoint that uses PDFBox to apply edits.
  const handleSave = async () => {
    if (!file) {
      toast({
        title: 'No file',
        description: 'Load a PDF first',
        variant: 'destructive',
      });
      return;
    }
    try {
      toast({ title: 'Saving', description: 'Uploading to server...' });
      const form = new FormData();
      form.append('file', file);
      // send metadata for server: annotations + optional page count
      form.append('annotations', JSON.stringify(annotations));
      form.append('pages', String(numPages));

      const res = await fetch('/api/pdfbox/apply-annotations', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('server error', text);
        toast({
          title: 'Save failed',
          description: `Server error: ${res.status}`,
          variant: 'destructive',
        });
        return;
      }

      const blob = await res.blob();
      const downloadName = `edited_${file.name}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Saved', description: 'Edited PDF downloaded' });
    } catch (e) {
      console.error(e);
      toast({
        title: 'Save failed',
        description: 'Network or server error',
        variant: 'destructive',
      });
    }
  };

  // signature helpers (unchanged)
  const initSigCanvas = (c: HTMLCanvasElement | null) => {
    sigCanvasRef.current = c;
    if (!c) return;
    c.width = 800;
    c.height = 200;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
  };

  const sigPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!sigCanvasRef.current) return;
    setIsSigDrawing(true);
    const r = sigCanvasRef.current.getBoundingClientRect();
    sigLastPos.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const sigPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isSigDrawing || !sigCanvasRef.current || !sigLastPos.current) return;
    const r = sigCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - r.left,
      y = e.clientY - r.top;
    const ctx = sigCanvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(sigLastPos.current.x, sigLastPos.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    sigLastPos.current = { x, y };
  };

  const sigPointerUp = () => {
    setIsSigDrawing(false);
    sigLastPos.current = null;
  };

  const clearSignatureCanvas = () => {
    if (!sigCanvasRef.current) return;
    const ctx = sigCanvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(
      0,
      0,
      sigCanvasRef.current.width,
      sigCanvasRef.current.height
    );
    setSavedSignatureDataUrl(null);
  };

  const saveDrawnSignature = () => {
    if (!sigCanvasRef.current) return;
    const url = sigCanvasRef.current.toDataURL('image/png');
    setSavedSignatureDataUrl(url);
    const img = new Image();
    img.onload = () => {
      const maxW = 240,
        maxH = 80;
      let w = img.width,
        h = img.height;
      if (w > maxW) {
        h = (h * maxW) / w;
        w = maxW;
      }
      if (h > maxH) {
        w = (w * maxH) / h;
        h = maxH;
      }
      const ann: Annotation = {
        id: `sig-${Date.now()}`,
        type: 'signature',
        page: currentPage,
        x: 60 / scale,
        y: 60 / scale,
        width: w / scale,
        height: h / scale,
        imageData: url,
      };
      const newAn = [...annotations, ann];
      setAnnotations(newAn);
      const nh = history.slice(0, historyIndex + 1);
      nh.push(newAn);
      setHistory(nh);
      setHistoryIndex(nh.length - 1);
      toast({ title: 'Signature added' });
      setShowSignatureDrawer(false);
    };
    img.src = url;
  };

  const addTypedSignature = () => {
    if (!signatureText) {
      toast({ title: 'Type name', variant: 'destructive' });
      return;
    }
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.font = `48px ${signatureFont}`;
    const metrics = ctx.measureText(signatureText);
    const w = Math.min(Math.max(200, metrics.width + 20), 800);
    const h = 80;
    c.width = w;
    c.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.font = `48px ${signatureFont}`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(signatureText, 10, h / 2);
    const dataUrl = c.toDataURL('image/png');
    const ann: Annotation = {
      id: `sig-${Date.now()}`,
      type: 'signature',
      page: currentPage,
      x: 60 / scale,
      y: 60 / scale,
      width: w / scale,
      height: h / scale,
      imageData: dataUrl,
    };
    const newAn = [...annotations, ann];
    setAnnotations(newAn);
    const nh = history.slice(0, historyIndex + 1);
    nh.push(newAn);
    setHistory(nh);
    setHistoryIndex(nh.length - 1);
    toast({ title: 'Signature added' });
    setShowSignatureDrawer(false);
  };

  useEffect(() => {
    if (historyIndex >= history.length) setHistoryIndex(history.length - 1);
  }, [history.length]);

  // --- UI ---
  if (!file) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Breadcrumb
            items={[
              { label: 'PDF Tools', href: '/' },
              { label: 'Edit PDF', href: '/pdf/edit' },
            ]}
          />

          <div className="max-w-2xl mx-auto mt-8">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Upload className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Edit PDF</h2>
                <p className="text-muted-foreground text-center mb-6">
                  Upload a PDF file to add text, drawings, shapes, highlights
                  and signatures
                </p>

                <Label htmlFor="file-upload">
                  <Button asChild data-testid="button-upload">
                    <span className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      Select PDF File
                    </span>
                  </Button>
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file"
                />

                <Button
                  variant="outline"
                  onClick={() => router.push('/')}
                  className="mt-4"
                  data-testid="button-back"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Tools
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const tools = [
    { id: 'select' as Tool, icon: MousePointer, label: 'Select' },
    { id: 'text' as Tool, icon: Type, label: 'Text' },
    { id: 'draw' as Tool, icon: Pencil, label: 'Draw' },
    { id: 'rectangle' as Tool, icon: Square, label: 'Rectangle' },
    { id: 'circle' as Tool, icon: Circle, label: 'Circle' },
    { id: 'highlight' as Tool, icon: Highlighter, label: 'Highlight' },
    { id: 'image' as Tool, icon: ImageIcon, label: 'Image' },
    { id: 'signature' as Tool, icon: FileSignature, label: 'Signature' },
    { id: 'eraser' as Tool, icon: Eraser, label: 'Eraser' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="flex h-[calc(100vh-4rem)]">
        <div className="w-72 border-r bg-card flex flex-col">
          <div className="p-4 border-b">
            <div className="mb-4">
              <Label className="text-xs mb-2 block">Select PDF</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="w-full cursor-pointer"
              />
            </div>

            <h3 className="font-semibold mb-4">Tools</h3>
            <div className="grid grid-cols-2 gap-2">
              {tools.map((tool) => (
                <Button
                  key={tool.id}
                  variant={activeTool === tool.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTool(tool.id)}
                  className="flex flex-col h-auto py-3"
                >
                  <tool.icon className="h-5 w-5 mb-1" />
                  <span className="text-xs">{tool.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="p-4 space-y-4">
            <div>
              <Label className="text-xs mb-2 block">Color</Label>
              <Input
                type="color"
                value={drawColor}
                onChange={(e) => {
                  setDrawColor(e.target.value);
                  setTextColor(e.target.value);
                }}
                className="h-10 cursor-pointer"
                data-testid="input-color"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={historyIndex <= 0}
                className="w-full"
              >
                <Undo className="mr-2 h-4 w-4" /> Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="w-full"
              >
                <Redo className="mr-2 h-4 w-4" /> Redo
              </Button>
            </div>

            <Separator />

            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" /> Save PDF
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/')}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b bg-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {numPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage(Math.min(numPages, currentPage + 1))
                }
                disabled={currentPage === numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScale(Math.max(0.5, scale - 0.25))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm w-16 text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScale(Math.min(3, scale + 0.25))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-muted/20 p-8">
            <div className="relative mx-auto" style={{ width: 'fit-content' }}>
              <canvas ref={canvasRef} className="border shadow-lg bg-white" />
              <canvas
                ref={annotationCanvasRef}
                className="absolute top-0 left-0"
                style={{
                  cursor: activeTool === 'select' ? 'default' : 'crosshair',
                }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={() => {
                  setIsDrawing(false);
                  setCurrentPoints([]);
                }}
              />

              {editingText && (
                <div
                  className="absolute z-50"
                  style={{
                    left: `${editingText.x}px`,
                    top: `${editingText.y}px`,
                  }}
                >
                  <Input
                    ref={editInputRef}
                    value={editingText.text}
                    onChange={(e) =>
                      setEditingText({ ...editingText, text: e.target.value })
                    }
                    onBlur={handleTextEditComplete}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleTextEditComplete();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setEditingText(null);
                      }
                    }}
                    className="min-w-[200px] h-8 text-sm border-2 border-blue-500"
                    autoFocus
                  />
                </div>
              )}

              <Input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {showSignatureDrawer && (
          <div className="w-96 border-l bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">Add Signature</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSignatureDrawer(false)}
              >
                Close
              </Button>
            </div>

            <div className="space-y-3">
              <Label className="text-xs">Typed Signature</Label>
              <Input
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                placeholder="Type your name"
              />
              <Label className="text-xs">Font</Label>
              <select
                value={signatureFont}
                onChange={(e) => setSignatureFont(e.target.value)}
                className="w-full p-2 border"
              >
                <option value='Pacifico, Georgia, "Times New Roman", serif'>
                  Pacifico / Script
                </option>
                <option value="Brush Script MT, Georgia, serif">
                  Brush Script
                </option>
                <option value="Segoe Script, Georgia, serif">
                  Segoe Script
                </option>
                <option value='Georgia, "Times New Roman", serif'>Serif</option>
                <option value="Arial, Helvetica, sans-serif">Sans</option>
              </select>
              <div className="flex gap-2">
                <Button onClick={addTypedSignature} className="flex-1">
                  Add Typed
                </Button>
                <Button onClick={() => setSignatureText('')}>Clear</Button>
              </div>

              <Separator />

              <Label className="text-xs">Draw Signature</Label>
              <div className="border">
                <canvas
                  ref={(c) => initSigCanvas(c)}
                  onPointerDown={sigPointerDown}
                  onPointerMove={sigPointerMove}
                  onPointerUp={sigPointerUp}
                  onPointerLeave={sigPointerUp}
                  style={{
                    width: '100%',
                    height: 120,
                    touchAction: 'none',
                    background: '#fff',
                  }}
                />
              </div>
              <div className="flex gap-2 mt-2">
                <Button onClick={saveDrawnSignature} className="flex-1">
                  Save Drawn
                </Button>
                <Button onClick={clearSignatureCanvas}>Clear</Button>
              </div>

              <Separator />

              <div>
                <Label className="text-xs">Or upload image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
