import { useState, useCallback, useRef, useEffect } from 'react';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  userId: string;
}

export const useCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [brushColor, setBrushColor] = useState('#2D2926');
  const [brushWidth, setBrushWidth] = useState(3);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'select'>('brush');

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX: number, clientY: number;

    if ('touches' in e) {
      const touch = e.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const point = getCanvasPoint(e);
    if (!point) return;

    setIsDrawing(true);
    setCurrentStroke([point]);
  }, [getCanvasPoint]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const point = getCanvasPoint(e);
    if (!point) return;

    setCurrentStroke(prev => [...prev, point]);
  }, [isDrawing, getCanvasPoint]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing || currentStroke.length === 0) return;

    const newStroke: Stroke = {
      id: crypto.randomUUID(),
      points: currentStroke,
      color: tool === 'eraser' ? '#F8F6F3' : brushColor,
      width: tool === 'eraser' ? brushWidth * 3 : brushWidth,
      userId: 'current-user',
    };

    setStrokes(prev => [...prev, newStroke]);
    setCurrentStroke([]);
    setIsDrawing(false);
  }, [isDrawing, currentStroke, brushColor, brushWidth, tool]);

  const clearCanvas = useCallback(() => {
    setStrokes([]);
    setCurrentStroke([]);
  }, []);

  const undo = useCallback(() => {
    setStrokes(prev => prev.slice(0, -1));
  }, []);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, points: Point[], color: string, width: number) => {
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(points[0].x, points[0].y);

    // Smooth the line using quadratic curves
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }

    // Last point
    if (points.length > 1) {
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    }

    ctx.stroke();
  }, []);

  // Redraw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#F8F6F3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#E8E4DF';
    ctx.lineWidth = 0.5;
    const gridSize = 24;
    
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw all strokes
    strokes.forEach(stroke => {
      drawStroke(ctx, stroke.points, stroke.color, stroke.width);
    });

    // Draw current stroke
    if (currentStroke.length > 0) {
      const color = tool === 'eraser' ? '#F8F6F3' : brushColor;
      const width = tool === 'eraser' ? brushWidth * 3 : brushWidth;
      drawStroke(ctx, currentStroke, color, width);
    }
  }, [strokes, currentStroke, brushColor, brushWidth, tool, drawStroke]);

  return {
    canvasRef,
    isDrawing,
    strokes,
    brushColor,
    setBrushColor,
    brushWidth,
    setBrushWidth,
    tool,
    setTool,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas,
    undo,
  };
};
