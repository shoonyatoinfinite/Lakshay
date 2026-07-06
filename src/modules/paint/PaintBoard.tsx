import React, { useRef, useState, useEffect } from 'react';
import { db } from '../../db/db';
import { sounds } from '../../utils/sounds';

type ToolType = 'pencil' | 'eraser' | 'line' | 'arrow' | 'rect' | 'circle' | 'triangle' | 'rightTriangle' | 'diamond' | 'star' | 'pentagon' | 'hexagon' | 'heart' | 'text' | 'select';
type BgMode = 'dark' | 'light' | 'grid' | 'blueprint';

interface Shape {
  id: string;
  type: ToolType;
  color: string;
  size: number;
  fill: boolean;
  fillOpacity: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  points?: { x: number; y: number }[];
  text?: string;
  x?: number;
  y?: number;
}

// Pure math helpers for outline hit-testing
const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
  const l2 = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
};

const isPointInPolygon = (x: number, y: number, vs: { x: number; y: number }[]) => {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].x, yi = vs[i].y;
    const xj = vs[j].x, yj = vs[j].y;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

export const PaintBoard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<ToolType>('pencil');
  const [color, setColor] = useState('#00f0ff');
  const [brushSize, setBrushSize] = useState(4);
  const [fillShape, setFillShape] = useState(false);
  const [fillOpacity, setFillOpacity] = useState(30);
  const [bgMode, setBgMode] = useState<BgMode>('grid');

  // Vector shapes list
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);

  // Drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeShapeId, setActiveShapeId] = useState<string | null>(null);

  // Moving states
  const [isMovingSelection, setIsMovingSelection] = useState(false);
  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);

  // Hover state (select mode hover over shape, or drawing tool automatic move hover)
  const [tempSelectMode, setTempSelectMode] = useState(false);

  // Drag Selecting states (drawing selection rectangle over multiple shapes)
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragSelectRect, setDragSelectRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Resizing states (nw / ne / sw / se resize handles)
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const [hoverCursor, setHoverCursor] = useState<string>('default');

  // Undo / Redo Stacks
  const [history, setHistory] = useState<Shape[][]>([]);
  const [redoStack, setRedoStack] = useState<Shape[][]>([]);

  // Text state
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const colors = ['#00f0ff', '#ff007f', '#ffb703', '#39ff14', '#9d4edd', '#ffffff', '#1b1b1b'];

  const hexToRgba = (hex: string, alpha: number) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result
      ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`
      : hex;
  };

  // ResizeObserver for dynamic scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redrawCanvas();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [shapes, selectedShapeIds, isDragSelecting, dragSelectRect]);

  // Global hotkeys (Ctrl+Z, Ctrl+Y, Delete/Backspace)
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (textInput) return; // Ignore during text entry
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if ((tool === 'select' || tempSelectMode) && selectedShapeIds.length > 0) {
          e.preventDefault();
          deleteSelectedShapes();
        }
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [shapes, history, redoStack, textInput, tool, selectedShapeIds, tempSelectMode]);

  // Focus textarea when displayed
  useEffect(() => {
    if (textInput && inputRef.current) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [textInput]);

  // Redraw canvas on layout updates (now includes bgMode dependencies for robust canvas resets)
  useEffect(() => {
    redrawCanvas();
  }, [shapes, selectedShapeIds, bgMode, isDragSelecting, dragSelectRect]);

  const handleUndo = () => {
    if (history.length === 0) return;
    const prevHistory = [...history];
    const prevState = prevHistory.pop();
    setHistory(prevHistory);
    setRedoStack(prev => [...prev, shapes]);
    if (prevState) {
      setShapes(prevState);
    }
    sounds.playClick();
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const prevRedo = [...redoStack];
    const nextState = prevRedo.pop();
    setRedoStack(prevRedo);
    setHistory(prev => [...prev, shapes]);
    if (nextState) {
      setShapes(nextState);
    }
    sounds.playClick();
  };

  const deleteSelectedShapes = () => {
    if (selectedShapeIds.length === 0) return;

    const copy = JSON.parse(JSON.stringify(shapes)) as Shape[];
    setHistory(prev => [...prev.slice(-29), copy]);
    setRedoStack([]);

    setShapes(prev => prev.filter(s => !selectedShapeIds.includes(s.id)));
    setSelectedShapeIds([]);
    sounds.playClick();
  };

  // Single Shape Bounding Box Utility
  const getSingleShapeBounds = (s: Shape) => {
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    if ((s.type === 'pencil' || s.type === 'eraser') && s.points && s.points.length > 0) {
      const xs = s.points.map(p => p.x);
      const ys = s.points.map(p => p.y);
      minX = Math.min(...xs);
      maxX = Math.max(...xs);
      minY = Math.min(...ys);
      maxY = Math.max(...ys);
    } else if (s.type === 'text' && s.x !== undefined && s.y !== undefined && s.text) {
      const lines = s.text.split('\n');
      const lineHeight = s.size * 3.5;
      const w = Math.max(...lines.map(l => l.length)) * s.size * 1.8;
      const h = lines.length * lineHeight;
      minX = s.x;
      maxX = s.x + w;
      minY = s.y - s.size * 3;
      maxY = s.y - s.size * 3 + h;
    } else if (s.startX !== undefined && s.startY !== undefined && s.endX !== undefined && s.endY !== undefined) {
      minX = Math.min(s.startX, s.endX);
      maxX = Math.max(s.startX, s.endX);
      minY = Math.min(s.startY, s.endY);
      maxY = Math.max(s.startY, s.endY);
    }
    return { minX, maxX, minY, maxY };
  };

  // Multiple Shapes Combined Bounding Box Utility
  const getSelectedShapesBounds = (ids: string[]) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let hasShapes = false;
    
    shapes.forEach(s => {
      if (ids.includes(s.id)) {
        hasShapes = true;
        const bounds = getSingleShapeBounds(s);
        minX = Math.min(minX, bounds.minX);
        maxX = Math.max(maxX, bounds.maxX);
        minY = Math.min(minY, bounds.minY);
        maxY = Math.max(maxY, bounds.maxY);
      }
    });
    
    if (!hasShapes) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    return { minX, maxX, minY, maxY };
  };

  // Find hover selection handles
  const findResizeHandle = (x: number, y: number): 'nw' | 'ne' | 'sw' | 'se' | null => {
    if (selectedShapeIds.length !== 1) return null;
    const s = shapes.find(sh => sh.id === selectedShapeIds[0]);
    if (!s) return null;
    
    const { minX, maxX, minY, maxY } = getSingleShapeBounds(s);
    const threshold = 14;

    if (Math.hypot(x - (minX - 5), y - (minY - 5)) < threshold) return 'nw';
    if (Math.hypot(x - (maxX + 5), y - (minY - 5)) < threshold) return 'ne';
    if (Math.hypot(x - (minX - 5), y - (maxY + 5)) < threshold) return 'sw';
    if (Math.hypot(x - (maxX + 5), y - (maxY + 5)) < threshold) return 'se';

    return null;
  };

  // Accurate outline/boundary-only click checking to allow drawing inside shapes
  const isPointOnShapeBoundary = (s: Shape, x: number, y: number): boolean => {
    const threshold = Math.max(12, s.size * 1.5);

    if ((s.type === 'pencil' || s.type === 'eraser') && s.points) {
      return s.points.some(p => Math.hypot(p.x - x, p.y - y) < threshold);
    }

    if (s.startX === undefined || s.startY === undefined || s.endX === undefined || s.endY === undefined) {
      if (s.type === 'text' && s.x !== undefined && s.y !== undefined && s.text) {
        const lines = s.text.split('\n');
        const lineHeight = s.size * 3.5;
        const textWidth = Math.max(...lines.map(l => l.length)) * s.size * 1.8;
        const textHeight = lines.length * lineHeight;
        return x >= s.x - 5 && x <= s.x + textWidth + 5 && y >= s.y - s.size * 3 && y <= s.y + textHeight;
      }
      return false;
    }

    const sx = s.startX;
    const sy = s.startY;
    const ex = s.endX;
    const ey = s.endY;

    if (s.type === 'line' || s.type === 'arrow') {
      return distToSegment(x, y, sx, sy, ex, ey) < threshold;
    }

    const checkPolygonBoundary = (vertices: { x: number; y: number }[]): boolean => {
      // Outline segment verification
      for (let i = 0; i < vertices.length; i++) {
        const next = vertices[(i + 1) % vertices.length];
        if (distToSegment(x, y, vertices[i].x, vertices[i].y, next.x, next.y) < threshold) {
          return true;
        }
      }
      // If filled shape, clicking inside selection is permitted
      if (s.fill) {
        return isPointInPolygon(x, y, vertices);
      }
      return false;
    };

    if (s.type === 'rect') {
      const vertices = [
        { x: sx, y: sy },
        { x: ex, y: sy },
        { x: ex, y: ey },
        { x: sx, y: ey }
      ];
      return checkPolygonBoundary(vertices);
    }

    if (s.type === 'circle') {
      const cx = sx + (ex - sx) / 2;
      const cy = sy + (ey - sy) / 2;
      const rx = Math.abs(ex - sx) / 2;
      const ry = Math.abs(ey - sy) / 2;
      if (rx === 0 || ry === 0) return false;

      const val = Math.pow(x - cx, 2) / Math.pow(rx, 2) + Math.pow(y - cy, 2) / Math.pow(ry, 2);
      if (s.fill) {
        return val <= 1.05;
      } else {
        const rAverage = (rx + ry) / 2;
        const distToCenter = Math.hypot(x - cx, y - cy);
        return Math.abs(distToCenter - rAverage) < threshold;
      }
    }

    if (s.type === 'triangle') {
      const vertices = [
        { x: sx + (ex - sx) / 2, y: sy },
        { x: ex, y: ey },
        { x: sx, y: ey }
      ];
      return checkPolygonBoundary(vertices);
    }

    if (s.type === 'rightTriangle') {
      const vertices = [
        { x: sx, y: sy },
        { x: ex, y: ey },
        { x: sx, y: ey }
      ];
      return checkPolygonBoundary(vertices);
    }

    if (s.type === 'diamond') {
      const dcx = sx + (ex - sx) / 2;
      const dcy = sy + (ey - sy) / 2;
      const vertices = [
        { x: dcx, y: sy },
        { x: ex, y: dcy },
        { x: dcx, y: ey },
        { x: sx, y: dcy }
      ];
      return checkPolygonBoundary(vertices);
    }

    if (s.type === 'pentagon') {
      const pcx = sx + (ex - sx) / 2;
      const pcy = sy + (ey - sy) / 2;
      const pr = Math.sqrt(Math.pow(ex - pcx, 2) + Math.pow(ey - pcy, 2));
      const vertices = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        vertices.push({ x: pcx + pr * Math.cos(angle), y: pcy + pr * Math.sin(angle) });
      }
      return checkPolygonBoundary(vertices);
    }

    if (s.type === 'hexagon') {
      const hcx = sx + (ex - sx) / 2;
      const hcy = sy + (ey - sy) / 2;
      const hr = Math.sqrt(Math.pow(ex - hcx, 2) + Math.pow(ey - hcy, 2));
      const vertices = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * 2 * Math.PI) / 6;
        vertices.push({ x: hcx + hr * Math.cos(angle), y: hcy + hr * Math.sin(angle) });
      }
      return checkPolygonBoundary(vertices);
    }

    if (s.type === 'star') {
      const radius = Math.sqrt(Math.pow(ex - sx, 2) + Math.pow(ey - sy, 2));
      const spikes = 5;
      const outerRadius = radius;
      const innerRadius = radius / 2;
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / spikes;
      const vertices = [];

      for (let i = 0; i < spikes; i++) {
        vertices.push({ x: sx + Math.cos(rot) * outerRadius, y: sy + Math.sin(rot) * outerRadius });
        rot += step;
        vertices.push({ x: sx + Math.cos(rot) * innerRadius, y: sy + Math.sin(rot) * innerRadius });
        rot += step;
      }
      return checkPolygonBoundary(vertices);
    }

    if (s.type === 'heart') {
      const minX = Math.min(sx, ex);
      const maxX = Math.max(sx, ex);
      const minY = Math.min(sy, ey);
      const maxY = Math.max(sy, ey);
      const w = maxX - minX;
      const h = maxY - minY;
      
      if (w === 0 || h === 0) return false;

      if (s.fill) {
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
      } else {
        const vertices: { x: number; y: number }[] = [];
        const steps = 12;
        
        // Curve 1
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const cx = Math.pow(1-t, 3)*(minX + w*0.5) + 3*Math.pow(1-t, 2)*t*(minX + w*0.5) + 3*(1-t)*Math.pow(t, 2)*(minX + w*0.45) + Math.pow(t, 3)*(minX + w*0.27);
          const cy = Math.pow(1-t, 3)*(minY + h*0.15) + 3*Math.pow(1-t, 2)*t*(minY + h*0.12) + 3*(1-t)*Math.pow(t, 2)*minY + Math.pow(t, 3)*minY;
          vertices.push({ x: cx, y: cy });
        }
        // Curve 2
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const cx = Math.pow(1-t, 3)*(minX + w*0.27) + 3*Math.pow(1-t, 2)*t*minX + 3*(1-t)*Math.pow(t, 2)*minX + Math.pow(t, 3)*minX;
          const cy = Math.pow(1-t, 3)*minY + 3*Math.pow(1-t, 2)*t*minY + 3*(1-t)*Math.pow(t, 2)*(minY + h*0.4) + Math.pow(t, 3)*(minY + h*0.4);
          vertices.push({ x: cx, y: cy });
        }
        // Curve 3
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const cx = Math.pow(1-t, 3)*minX + 3*Math.pow(1-t, 2)*t*minX + 3*(1-t)*Math.pow(t, 2)*(minX + w*0.18) + Math.pow(t, 3)*(minX + w*0.5);
          const cy = Math.pow(1-t, 3)*(minY + h*0.4) + 3*Math.pow(1-t, 2)*t*(minY + h*0.58) + 3*(1-t)*Math.pow(t, 2)*(minY + h*0.81) + Math.pow(t, 3)*(minY + h);
          vertices.push({ x: cx, y: cy });
        }
        // Curve 4
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const cx = Math.pow(1-t, 3)*(minX + w*0.5) + 3*Math.pow(1-t, 2)*t*(minX + w*0.82) + 3*(1-t)*Math.pow(t, 2)*(minX + w) + Math.pow(t, 3)*(minX + w);
          const cy = Math.pow(1-t, 3)*(minY + h) + 3*Math.pow(1-t, 2)*t*(minY + h*0.81) + 3*(1-t)*Math.pow(t, 2)*(minY + h*0.58) + Math.pow(t, 3)*(minY + h*0.4);
          vertices.push({ x: cx, y: cy });
        }
        // Curve 5
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const cx = Math.pow(1-t, 3)*(minX + w) + 3*Math.pow(1-t, 2)*t*(minX + w) + 3*(1-t)*Math.pow(t, 2)*(minX + w) + Math.pow(t, 3)*(minX + w*0.73);
          const cy = Math.pow(1-t, 3)*(minY + h*0.4) + 3*Math.pow(1-t, 2)*t*(minY + h*0.4) + 3*(1-t)*Math.pow(t, 2)*minY + Math.pow(t, 3)*minY;
          vertices.push({ x: cx, y: cy });
        }
        // Curve 6
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const cx = Math.pow(1-t, 3)*(minX + w*0.73) + 3*Math.pow(1-t, 2)*t*(minX + w*0.59) + 3*(1-t)*Math.pow(t, 2)*(minX + w*0.5) + Math.pow(t, 3)*(minX + w*0.5);
          const cy = Math.pow(1-t, 3)*minY + 3*Math.pow(1-t, 2)*t*minY + 3*(1-t)*Math.pow(t, 2)*(minY + h*0.12) + Math.pow(t, 3)*(minY + h*0.15);
          vertices.push({ x: cx, y: cy });
        }
        return checkPolygonBoundary(vertices);
      }
    }

    return false;
  };

  // Shape list search using outline verification
  const findShapeAt = (x: number, y: number, shapeList: Shape[]): Shape | null => {
    for (let i = shapeList.length - 1; i >= 0; i--) {
      const s = shapeList[i];
      if (isPointOnShapeBoundary(s, x, y)) {
        return s;
      }
    }
    return null;
  };

  // Drag selection checking: check if shape intersects or lies inside drag selection box
  const isShapeInRect = (s: Shape, rx1: number, ry1: number, rx2: number, ry2: number): boolean => {
    const bounds = getSingleShapeBounds(s);
    return (
      bounds.minX >= Math.min(rx1, rx2) &&
      bounds.maxX <= Math.max(rx1, rx2) &&
      bounds.minY >= Math.min(ry1, ry2) &&
      bounds.maxY <= Math.max(ry1, ry2)
    );
  };

  const commitText = (text: string) => {
    if (!textInput) return;
    const trimmed = text.trim();
    if (trimmed) {
      const newShape: Shape = {
        id: crypto.randomUUID(),
        type: 'text',
        color: color,
        size: brushSize,
        fill: false,
        fillOpacity: 100,
        text: trimmed,
        x: textInput.x,
        y: textInput.y
      };
      
      const copy = JSON.parse(JSON.stringify(shapes)) as Shape[];
      setHistory(prev => [...prev.slice(-29), copy]);
      setRedoStack([]);
      
      setShapes(prev => [...prev, newShape]);
      sounds.playClick();
    }
    setTextInput(null);
  };

  // Drawing helpers
  const drawArrowHelper = (ctx: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number, size: number) => {
    const headlen = Math.max(12, size * 2.5);
    const dx = tox - fromx;
    const dy = toy - fromy;
    const angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const drawStarHelper = (ctx: CanvasRenderingContext2D, cx: number, cy: number, ex: number, ey: number, fill: boolean) => {
    const radius = Math.sqrt(Math.pow(ex - cx, 2) + Math.pow(ey - cy, 2));
    const spikes = 5;
    const outerRadius = radius;
    const innerRadius = radius / 2;
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    if (fill) ctx.fill();
    ctx.stroke();
  };

  const drawShape = (ctx: CanvasRenderingContext2D, s: Shape) => {
    ctx.lineWidth = s.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = s.color;
    ctx.fillStyle = hexToRgba(s.color, s.fillOpacity / 100);

    if (s.type === 'pencil' && s.points && s.points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      ctx.stroke();
    }
    else if (s.type === 'eraser' && s.points && s.points.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
    else if (s.type === 'text' && s.x !== undefined && s.y !== undefined && s.text) {
      ctx.font = `${s.size * 3}px sans-serif`;
      ctx.fillStyle = s.color;
      const lines = s.text.split('\n');
      const lineHeight = s.size * 3.5;
      lines.forEach((line, index) => {
        ctx.fillText(line, s.x!, s.y! + (index * lineHeight));
      });
    }
    else if (s.startX !== undefined && s.startY !== undefined && s.endX !== undefined && s.endY !== undefined) {
      const sx = s.startX;
      const sy = s.startY;
      const ex = s.endX;
      const ey = s.endY;

      switch (s.type) {
        case 'line':
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          break;
        case 'arrow':
          drawArrowHelper(ctx, sx, sy, ex, ey, s.size);
          break;
        case 'rect':
          ctx.beginPath();
          ctx.rect(sx, sy, ex - sx, ey - sy);
          if (s.fill) ctx.fill();
          ctx.stroke();
          break;
        case 'circle':
          ctx.beginPath();
          const cx = sx + (ex - sx) / 2;
          const cy = sy + (ey - sy) / 2;
          const rx = Math.abs(ex - sx) / 2;
          const ry = Math.abs(ey - sy) / 2;
          ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
          if (s.fill) ctx.fill();
          ctx.stroke();
          break;
        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(sx + (ex - sx) / 2, sy);
          ctx.lineTo(ex, ey);
          ctx.lineTo(sx, ey);
          ctx.closePath();
          if (s.fill) ctx.fill();
          ctx.stroke();
          break;
        case 'rightTriangle':
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx, ey);
          ctx.lineTo(ex, ey);
          ctx.closePath();
          if (s.fill) ctx.fill();
          ctx.stroke();
          break;
        case 'diamond':
          const dcx = sx + (ex - sx) / 2;
          const dcy = sy + (ey - sy) / 2;
          ctx.beginPath();
          ctx.moveTo(dcx, sy);
          ctx.lineTo(ex, dcy);
          ctx.lineTo(dcx, ey);
          ctx.lineTo(sx, dcy);
          ctx.closePath();
          if (s.fill) ctx.fill();
          ctx.stroke();
          break;
        case 'star':
          drawStarHelper(ctx, sx, sy, ex, ey, s.fill);
          break;
        case 'pentagon':
          const pcx = sx + (ex - sx) / 2;
          const pcy = sy + (ey - sy) / 2;
          const pr = Math.sqrt(Math.pow(ex - pcx, 2) + Math.pow(ey - pcy, 2));
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
            ctx.lineTo(pcx + pr * Math.cos(angle), pcy + pr * Math.sin(angle));
          }
          ctx.closePath();
          if (s.fill) ctx.fill();
          ctx.stroke();
          break;
        case 'hexagon':
          const hcx = sx + (ex - sx) / 2;
          const hcy = sy + (ey - sy) / 2;
          const hr = Math.sqrt(Math.pow(ex - hcx, 2) + Math.pow(ey - hcy, 2));
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i * 2 * Math.PI) / 6;
            ctx.lineTo(hcx + hr * Math.cos(angle), hcy + hr * Math.sin(angle));
          }
          ctx.closePath();
          if (s.fill) ctx.fill();
          ctx.stroke();
          break;
        case 'heart': {
          const x = Math.min(sx, ex);
          const y = Math.min(sy, ey);
          const w = Math.abs(ex - sx);
          const h = Math.abs(ey - sy);
          if (w === 0 || h === 0) break;

          ctx.beginPath();
          ctx.moveTo(x + w * 0.5, y + h * 0.15);
          // Curve 1 (left lobe)
          ctx.bezierCurveTo(x + w * 0.5, y + h * 0.12, x + w * 0.45, y, x + w * 0.27, y);
          // Curve 2 (left side)
          ctx.bezierCurveTo(x, y, x, y + h * 0.4, x, y + h * 0.4);
          // Curve 3 (bottom-left edge)
          ctx.bezierCurveTo(x, y + h * 0.58, x + w * 0.18, y + h * 0.81, x + w * 0.5, y + h);
          // Curve 4 (bottom-right edge)
          ctx.bezierCurveTo(x + w * 0.82, y + h * 0.81, x + w, y + h * 0.58, x + w, y + h * 0.4);
          // Curve 5 (right side)
          ctx.bezierCurveTo(x + w, y + h * 0.4, x + w, y, x + w * 0.73, y);
          // Curve 6 (right lobe)
          ctx.bezierCurveTo(x + w * 0.59, y, x + w * 0.5, y + h * 0.12, x + w * 0.5, y + h * 0.15);
          ctx.closePath();
          if (s.fill) ctx.fill();
          ctx.stroke();
          break;
        }
      }
    }
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    shapes.forEach(s => drawShape(ctx, s));

    // Draw active drag selection rectangle overlay
    if (isDragSelecting && dragSelectRect) {
      ctx.strokeStyle = 'rgba(var(--accent-color-rgb), 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.rect(
        dragSelectRect.x1, 
        dragSelectRect.y1, 
        dragSelectRect.x2 - dragSelectRect.x1, 
        dragSelectRect.y2 - dragSelectRect.y1
      );
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Selection frame highlight & resize handles
    if (selectedShapeIds.length > 0 && (tool === 'select' || tempSelectMode)) {
      const bounds = getSelectedShapesBounds(selectedShapeIds);

      // Bounding outline box
      ctx.strokeStyle = 'rgba(var(--accent-color-rgb), 0.8)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.rect(bounds.minX - 5, bounds.minY - 5, (bounds.maxX - bounds.minX) + 10, (bounds.maxY - bounds.minY) + 10);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw resizing handles only if exactly 1 shape is active
      if (selectedShapeIds.length === 1) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'var(--accent-color)';
        ctx.lineWidth = 2;
        const hSize = 8;

        const handles = [
          { x: bounds.minX - 5, y: bounds.minY - 5 },
          { x: bounds.maxX + 5, y: bounds.minY - 5 },
          { x: bounds.minX - 5, y: bounds.maxY + 5 },
          { x: bounds.maxX + 5, y: bounds.maxY + 5 }
        ];

        handles.forEach(h => {
          ctx.beginPath();
          ctx.rect(h.x - hSize / 2, h.y - hSize / 2, hSize, hSize);
          ctx.fill();
          ctx.stroke();
        });
      }
    }
  };

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = ('touches' in e) ? e.touches[0].clientX : e.clientX;
    const clientY = ('touches' in e) ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (tool === 'text') {
      setTextInput({ x, y });
      return;
    }

    // A. Check if resizing handle is clicked (only when 1 shape is selected)
    if (selectedShapeIds.length === 1) {
      const handle = findResizeHandle(x, y);
      if (handle) {
        setIsResizing(true);
        setResizeHandle(handle);
        dragStartXRef.current = x;
        dragStartYRef.current = y;

        const copy = JSON.parse(JSON.stringify(shapes)) as Shape[];
        setHistory(prev => [...prev.slice(-29), copy]);
        setRedoStack([]);
        return;
      }
    }

    // B. Check if clicking inside selection bounds or hovering over border
    const clickedShape = findShapeAt(x, y, shapes);
    const singleSelectedId = selectedShapeIds.length === 1 ? selectedShapeIds[0] : null;

    const isClickInsideSelection = clickedShape && selectedShapeIds.includes(clickedShape.id);
    
    // Only allow auto-moving shapes via hover boundary when:
    // 1. Tool is 'select' (manual Move mode)
    // 2. OR the clicked shape is the CURRENTLY active selected shape (the newly drawn shape auto-move)
    const isTempMove = clickedShape && (tool === 'select' || (singleSelectedId && clickedShape.id === singleSelectedId)) && tempSelectMode;

    if (isClickInsideSelection || isTempMove) {
      setIsMovingSelection(true);
      dragStartXRef.current = x;
      dragStartYRef.current = y;

      const activeId = clickedShape.id;
      if (e.shiftKey) {
        setSelectedShapeIds(prev => 
          prev.includes(activeId) ? prev.filter(id => id !== activeId) : [...prev, activeId]
        );
      } else if (!selectedShapeIds.includes(activeId)) {
        setSelectedShapeIds([activeId]);
      }

      const copy = JSON.parse(JSON.stringify(shapes)) as Shape[];
      setHistory(prev => [...prev.slice(-29), copy]);
      setRedoStack([]);
      return;
    }

    // C. Clicked empty space or outside selection
    // Clear selection immediately to allow normal drawing or empty click behavior
    setSelectedShapeIds([]);

    if (tool === 'select') {
      setIsDragSelecting(true);
      setDragSelectRect({ x1: x, y1: y, x2: x, y2: y });
      return;
    }

    // Start drawing shape
    setIsDrawing(true);
    const newId = crypto.randomUUID();
    setActiveShapeId(newId);

    const newShape: Shape = {
      id: newId,
      type: tool,
      color: color,
      size: brushSize,
      fill: fillShape,
      fillOpacity: fillOpacity,
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      points: (tool === 'pencil' || tool === 'eraser') ? [{ x, y }] : []
    };

    const copy = JSON.parse(JSON.stringify(shapes)) as Shape[];
    setHistory(prev => [...prev.slice(-29), copy]);
    setRedoStack([]);

    setShapes(prev => [...prev, newShape]);
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = ('touches' in e) ? e.touches[0].clientX : e.clientX;
    const clientY = ('touches' in e) ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Hover cursor highlights & Auto Move trigger detection
    if (!isDrawing && !isMovingSelection && !isResizing && !isDragSelecting) {
      const isSelectActive = tool === 'select';
      const singleSelectedId = selectedShapeIds.length === 1 ? selectedShapeIds[0] : null;

      const handle = findResizeHandle(x, y);
      if (handle && singleSelectedId) {
        setHoverCursor(handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize');
        setTempSelectMode(false);
      } else {
        const hovered = findShapeAt(x, y, shapes);
        
        // Auto-move boundary is engaged ONLY if:
        // 1. Tool is 'select' (manual Move mode)
        // 2. OR the hovered shape is the CURRENTLY active selection (newly drawn shape auto-move)
        const isHoveringOnActiveSelection = hovered && singleSelectedId && hovered.id === singleSelectedId;
        
        if (isHoveringOnActiveSelection || (isSelectActive && hovered)) {
          setHoverCursor('move');
          setTempSelectMode(true);
        } else {
          setHoverCursor(isSelectActive ? 'default' : 'crosshair');
          setTempSelectMode(false);
        }
      }
    }

    // Drag Selecting multi-shapes box
    if (isDragSelecting) {
      setDragSelectRect(prev => prev ? { ...prev, x2: x, y2: y } : null);
      return;
    }

    // Handle Resizing
    if (isResizing && selectedShapeIds.length === 1 && resizeHandle) {
      const dx = x - dragStartXRef.current;
      const dy = y - dragStartYRef.current;
      const targetId = selectedShapeIds[0];

      setShapes(prev => prev.map(s => {
        if (s.id === targetId) {
          if ((s.type === 'pencil' || s.type === 'eraser') && s.points && s.points.length > 0) {
            const bounds = getSingleShapeBounds(s);
            const w = bounds.maxX - bounds.minX;
            const h = bounds.maxY - bounds.minY;
            if (w === 0 || h === 0) return s;

            let newMinX = bounds.minX;
            let newMaxX = bounds.maxX;
            let newMinY = bounds.minY;
            let newMaxY = bounds.maxY;

            if (resizeHandle === 'nw') { newMinX += dx; newMinY += dy; }
            else if (resizeHandle === 'ne') { newMaxX += dx; newMinY += dy; }
            else if (resizeHandle === 'sw') { newMinX += dx; newMaxY += dy; }
            else if (resizeHandle === 'se') { newMaxX += dx; newMaxY += dy; }

            const newW = newMaxX - newMinX;
            const newH = newMaxY - newMinY;
            if (newW <= 4 || newH <= 4) return s;

            const scaleX = newW / w;
            const scaleY = newH / h;

            return {
              ...s,
              points: s.points.map(p => ({
                x: newMinX + (p.x - bounds.minX) * scaleX,
                y: newMinY + (p.y - bounds.minY) * scaleY
              }))
            };
          }
          else if (s.type === 'text') {
            let newX = s.x || 0;
            let newY = s.y || 0;
            let newSize = s.size;
            
            if (resizeHandle === 'se' || resizeHandle === 'ne') {
              newSize = Math.max(4, newSize + dx / 4);
            } else if (resizeHandle === 'nw' || resizeHandle === 'sw') {
              newX += dx;
              newSize = Math.max(4, newSize - dx / 4);
            }
            
            return {
              ...s,
              x: newX,
              y: newY,
              size: newSize
            };
          }
          else if (s.startX !== undefined && s.startY !== undefined && s.endX !== undefined && s.endY !== undefined) {
            let nSX = s.startX;
            let nSY = s.startY;
            let nEX = s.endX;
            let nEY = s.endY;

            if (resizeHandle === 'nw') { nSX += dx; nSY += dy; }
            else if (resizeHandle === 'ne') { nEX += dx; nSY += dy; }
            else if (resizeHandle === 'sw') { nSX += dx; nEY += dy; }
            else if (resizeHandle === 'se') { nEX += dx; nEY += dy; }

            return {
              ...s,
              startX: nSX,
              startY: nSY,
              endX: nEX,
              endY: nEY
            };
          }
        }
        return s;
      }));

      dragStartXRef.current = x;
      dragStartYRef.current = y;
      return;
    }

    // Move Selection (Multi shape move translation)
    if (isMovingSelection && selectedShapeIds.length > 0) {
      const dx = x - dragStartXRef.current;
      const dy = y - dragStartYRef.current;

      setShapes(prev => prev.map(s => {
        if (selectedShapeIds.includes(s.id)) {
          if ((s.type === 'pencil' || s.type === 'eraser') && s.points) {
            return {
              ...s,
              points: s.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
            };
          } else if (s.type === 'text') {
            return {
              ...s,
              x: (s.x || 0) + dx,
              y: (s.y || 0) + dy
            };
          } else {
            return {
              ...s,
              startX: (s.startX || 0) + dx,
              startY: (s.startY || 0) + dy,
              endX: (s.endX || 0) + dx,
              endY: (s.endY || 0) + dy
            };
          }
        }
        return s;
      }));

      dragStartXRef.current = x;
      dragStartYRef.current = y;
      return;
    }

    if (!isDrawing || !activeShapeId) return;

    if (tool === 'pencil' || tool === 'eraser') {
      setShapes(prev => prev.map(s => {
        if (s.id === activeShapeId) {
          return {
            ...s,
            points: [...(s.points || []), { x, y }]
          };
        }
        return s;
      }));
    } else {
      setShapes(prev => prev.map(s => {
        if (s.id === activeShapeId) {
          return {
            ...s,
            endX: x,
            endY: y
          };
        }
        return s;
      }));
    }
  };

  const handleStop = () => {
    setIsDrawing(false);
    setIsMovingSelection(false);
    setIsResizing(false);
    setResizeHandle(null);

    // Auto-select the newly drawn shape immediately
    if (activeShapeId) {
      setSelectedShapeIds([activeShapeId]);
    }
    setActiveShapeId(null);

    // Finalize Drag selection and map shapes
    if (isDragSelecting && dragSelectRect) {
      setIsDragSelecting(false);
      const selected = shapes.filter(s => 
        isShapeInRect(s, dragSelectRect.x1, dragSelectRect.y1, dragSelectRect.x2, dragSelectRect.y2)
      );
      setSelectedShapeIds(selected.map(s => s.id));
      setDragSelectRect(null);
    }
  };

  const clearCanvas = () => {
    const copy = JSON.parse(JSON.stringify(shapes)) as Shape[];
    setHistory(prev => [...prev.slice(-29), copy]);
    setRedoStack([]);
    setShapes([]);
    setSelectedShapeIds([]);
    sounds.playClick();
  };

  const getMergedDataURL = () => {
    const canvas = canvasRef.current;
    if (!canvas) return '';

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return canvas.toDataURL('image/png');

    if (bgMode === 'light') {
      exportCtx.fillStyle = '#ffffff';
      exportCtx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (bgMode === 'blueprint') {
      exportCtx.fillStyle = '#102244';
      exportCtx.fillRect(0, 0, canvas.width, canvas.height);
      exportCtx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
      exportCtx.lineWidth = 1;
      const size = 30;
      exportCtx.beginPath();
      for (let x = 0; x < canvas.width; x += size) {
        exportCtx.moveTo(x, 0); exportCtx.lineTo(x, canvas.height);
      }
      for (let y = 0; y < canvas.height; y += size) {
        exportCtx.moveTo(0, y); exportCtx.lineTo(canvas.width, y);
      }
      exportCtx.stroke();
    } else if (bgMode === 'grid') {
      exportCtx.fillStyle = '#1e1f29';
      exportCtx.fillRect(0, 0, canvas.width, canvas.height);
      exportCtx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      exportCtx.lineWidth = 1;
      const size = 30;
      exportCtx.beginPath();
      for (let x = 0; x < canvas.width; x += size) {
        exportCtx.moveTo(x, 0); exportCtx.lineTo(x, canvas.height);
      }
      for (let y = 0; y < canvas.height; y += size) {
        exportCtx.moveTo(0, y); exportCtx.lineTo(canvas.width, y);
      }
      exportCtx.stroke();
    } else {
      exportCtx.fillStyle = '#1e1f29';
      exportCtx.fillRect(0, 0, canvas.width, canvas.height);
    }

    shapes.forEach(s => drawShape(exportCtx, s));
    return exportCanvas.toDataURL('image/png');
  };

  const downloadDrawing = () => {
    const url = getMergedDataURL();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `lakshya_sketch_${Date.now()}.png`;
    a.click();
    sounds.playSuccess();
  };

  const saveToNotebook = async () => {
    const url = getMergedDataURL();
    if (!url) return;
    
    const noteId = crypto.randomUUID();
    const newNote = {
      id: noteId,
      title: `Drawing Sketch ${new Date().toLocaleDateString()}`,
      content: `### My Drawing\n\n![Sketch](${url})\n\nCreated using Paint Board.`,
      tags: ['drawing'],
      folder: 'Drawings',
      updatedAt: Date.now()
    };
    
    try {
      await db.put('notes', newNote);
      alert('Sketch successfully saved to your Notebook!');
      sounds.playSuccess();
    } catch (err) {
      console.error(err);
      alert('Failed to save sketch.');
    }
  };

  return (
    <div className="module-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="module-header" style={{ paddingBottom: '2px' }}>
        <div>
          <h2 style={{ fontSize: '18px' }}>✏️ Paint & Drawing Suite</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Sketch figures, draft quick visual ideas, and save drafts directly into notes.</p>
        </div>
      </div>

      <div className="module-body" style={{ flex: 1, display: 'flex', gap: '16px', overflow: 'hidden' }}>
        
        {/* Controls Sidebar */}
        <div className="glass-panel" style={{ width: '250px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflowY: 'auto' }}>
          
          {/* Tool selectors */}
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Drawing Tools</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '6px' }}>
              {([
                { id: 'pencil', label: 'Draw', icon: '✏️' },
                { id: 'eraser', label: 'Eraser', icon: '🧽' },
                { id: 'text', label: 'Text', icon: '🔠' },
                { id: 'select', label: 'Move', icon: '🖐️' },
                { id: 'line', label: 'Line', icon: '➖' },
                { id: 'arrow', label: 'Arrow', icon: '↗️' },
                { id: 'rect', label: 'Rect', icon: '⬛' },
                { id: 'circle', label: 'Circle', icon: '⚪' },
                { id: 'triangle', label: 'Tri', icon: '🔺' },
                { id: 'rightTriangle', label: 'R-Tri', icon: '📐' },
                { id: 'diamond', label: 'Diamond', icon: '💎' },
                { id: 'star', label: 'Star', icon: '⭐' },
                { id: 'pentagon', label: 'Pent', icon: '⬟' },
                { id: 'hexagon', label: 'Hex', icon: '⬡' },
                { id: 'heart', label: 'Heart', icon: '❤️' }
              ] as { id: ToolType; label: string; icon: string }[]).map(t => (
                <button
                  key={t.id}
                  className="btn"
                  style={{
                    padding: '6px 2px',
                    justifyContent: 'center',
                    background: tool === t.id ? 'rgba(var(--accent-color-rgb), 0.15)' : 'rgba(255,255,255,0.02)',
                    borderColor: tool === t.id ? 'var(--accent-color)' : 'var(--glass-border)',
                    fontSize: '11px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onClick={() => { setTool(t.id); sounds.playClick(); }}
                  title={t.label}
                >
                  <span style={{ fontSize: '15px' }}>{t.icon}</span>
                  <span style={{ fontSize: '9px', textTransform: 'capitalize' }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Background Modes */}
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Canvas Style</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
              {([
                { id: 'dark', name: 'Dark solid' },
                { id: 'light', name: 'Light solid' },
                { id: 'grid', name: 'Dark grid' },
                { id: 'blueprint', name: 'Blueprint' }
              ] as { id: BgMode; name: string }[]).map(m => (
                <button
                  key={m.id}
                  className="btn"
                  style={{
                    fontSize: '10px',
                    padding: '4px 2px',
                    justifyContent: 'center',
                    background: bgMode === m.id ? 'rgba(var(--accent-color-rgb), 0.12)' : 'rgba(255,255,255,0.02)',
                    borderColor: bgMode === m.id ? 'var(--accent-color)' : 'var(--glass-border)'
                  }}
                  onClick={() => { setBgMode(m.id); sounds.playClick(); }}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Color palette */}
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Colors</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
              {colors.map(c => (
                <div
                  key={c}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: c,
                    cursor: 'pointer',
                    border: color === c ? '2px solid #fff' : '2px solid transparent',
                    boxShadow: color === c ? '0 0 8px rgba(255,255,255,0.6)' : 'none'
                  }}
                  onClick={() => { setColor(c); sounds.playClick(); }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{
                  width: '24px',
                  height: '24px',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 0
                }}
                title="Custom color picker"
              />
            </div>
          </div>

          {/* Stroke size */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
              <span>Brush Size</span>
              <span>{brushSize}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              style={{ width: '100%', marginTop: '6px', accentColor: 'var(--accent-color)' }}
            />
          </div>

          {/* Fill shape & Opacity config */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={fillShape}
                onChange={(e) => { setFillShape(e.target.checked); sounds.playClick(); }}
                style={{ accentColor: 'var(--accent-color)' }}
              />
              <span style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px' }}>Fill Shapes</span>
            </label>
            {fillShape && (
              <div style={{ marginTop: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                  <span>Fill Opacity</span>
                  <span>{fillOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={fillOpacity}
                  onChange={(e) => setFillOpacity(parseInt(e.target.value))}
                  style={{ width: '100%', marginTop: '4px', accentColor: 'var(--accent-color)' }}
                />
              </div>
            )}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Utility Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={saveToNotebook}>
              📝 Save to Notebook
            </button>
            
            {/* Contextual Delete Selected item */}
            {selectedShapeIds.length > 0 && (tool === 'select' || tempSelectMode) && (
              <button 
                className="btn btn-danger" 
                style={{ justifyContent: 'center', background: 'rgba(255, 75, 75, 0.15)', borderColor: '#ff4b4b', color: '#ff4b4b' }} 
                onClick={deleteSelectedShapes}
              >
                🗑️ Delete Selected ({selectedShapeIds.length})
              </button>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button className="btn" style={{ justifyContent: 'center' }} onClick={handleUndo} title="Undo (Ctrl+Z)" disabled={history.length === 0}>
                ↩️ Undo
              </button>
              <button className="btn" style={{ justifyContent: 'center' }} onClick={handleRedo} title="Redo (Ctrl+Y)" disabled={redoStack.length === 0}>
                ↪️ Redo
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button className="btn" style={{ justifyContent: 'center' }} onClick={downloadDrawing}>
                📥 PNG
              </button>
              <button className="btn btn-danger" style={{ justifyContent: 'center' }} onClick={clearCanvas}>
                🗑️ Clear All
              </button>
            </div>
          </div>

        </div>

        {/* Drawing Canvas Area */}
        <div 
          className={`canvas-bg-${bgMode}`}
          style={{ flex: 1, height: '100%', position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}
        >
          {textInput && (
            <textarea
              ref={inputRef}
              style={{
                position: 'absolute',
                left: `${textInput.x}px`,
                top: `${textInput.y - (Math.max(14, brushSize * 3.5) / 2)}px`,
                font: `${Math.max(14, brushSize * 3.5)}px sans-serif`,
                color: color,
                background: 'rgba(30, 31, 41, 0.95)',
                border: '1.5px solid var(--accent-color)',
                borderRadius: '6px',
                outline: 'none',
                padding: '6px 10px',
                caretColor: color,
                zIndex: 100,
                minWidth: '220px',
                minHeight: '42px',
                resize: 'none',
                overflow: 'hidden',
                lineHeight: 1.2,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                colorScheme: 'dark'
              }}
              defaultValue=""
              placeholder="Type text, Enter/Blur to save"
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  commitText(e.currentTarget.value);
                } else if (e.key === 'Escape') {
                  setTextInput(null);
                }
              }}
              onBlur={(e) => commitText(e.currentTarget.value)}
            />
          )}
          <canvas
            ref={canvasRef}
            style={{ 
              width: '100%', 
              height: '100%', 
              display: 'block', 
              background: 'transparent',
              cursor: tool === 'select' || tempSelectMode ? hoverCursor : 'crosshair'
            }}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleStop}
            onMouseLeave={handleStop}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleStop}
          />
        </div>
      </div>
    </div>
  );
};
