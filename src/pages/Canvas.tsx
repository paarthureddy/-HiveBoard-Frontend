import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { isPointInPolygon } from "@/lib/geometry";
import html2canvas from 'html2canvas';
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useCanvas } from "@/hooks/useCanvas";
import { useAuth } from "@/contexts/AuthContext";
import { useGuest } from "@/contexts/GuestContext";
import { useSocket } from "@/hooks/useSocket";
import { joinRoom, leaveRoom, sendStroke, sendPoint, sendClearCanvas, sendUndo, requestCanvasState, sendMessage, sendCanvasBackground, sendAddCroquis, sendUpdateCroquis, sendDeleteCroquis, sendAddSticky, sendUpdateSticky, sendDeleteSticky, sendAddText, sendUpdateText, sendDeleteText, sendUpdateStroke, sendDeleteStroke } from "@/lib/socket";
import { meetingsAPI } from "@/lib/api";
import Toolbar from "@/components/canvas/Toolbar";
import ChatPanel from "@/components/canvas/ChatPanel";
import AiChatPanel from "@/components/canvas/AiChatPanel";
import UserPresence from "@/components/canvas/UserPresence";
import ParticipantsList from "@/components/ParticipantsList";
import ShareModal from "@/components/ShareModal";
import LoginPromptModal from "@/components/LoginPromptModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import { User, ChatMessage, PRESENCE_COLORS, StickyNote, TextItem, CroquisItem, Stroke } from "@/types/canvas";
import type { Participant } from "@/types/room";
import logo from "@/assets/hive-logo.jpg";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { SelectTransformer } from "@/components/canvas/SelectTransformer";
import {
  Share2,
  Download,
  MoreHorizontal,
  Lock,
  LogIn,
  Loader2,
  Eye,
  Trash2,
  LockOpen,
  Copy,
  FlipHorizontal,
  Maximize2,
  AlignCenter,
  Minus,
  Plus,
  FolderOpen,
  ImageDown,
  Command,
  Search,
  CircleHelp,
  Palette,
  ImagePlus,
  ShieldAlert,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";


const MOCK_MESSAGES: ChatMessage[] = [];

/**
 * Canvas Page (The Core App)
 * 
 * This is the main whiteboard interface. It orchestrates:
 * 1. The Infinite Canvas (Pan/Zoom/Draw).
 * 2. Real-time Collaboration (Socket.io integration).
 * 3. Tools & Toolbar (Brush, Eraser, Sticky Notes, Text, Croquis).
 * 4. User Presence (Cursors, Avatars).
 * 5. Object Management (Moving, Resizing, Deleting).
 * 
 * It combines the `useCanvas` hook (rendering) with `useSocket` (networking)
 * to create a seamless multiplayer experience.
 */
const Canvas = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // --- Authentication State ---
  // Determine if the current user is a registered member or a guest
  const { user, isAuthenticated } = useAuth();
  const { guestUser, isGuest, setGuestUser } = useGuest();

  // --- Session Role & Permissions ---
  // sessionRole is derived after the meeting loads: owner > editor > viewer/guest
  // - 'owner'  : authenticated user who created the meeting
  // - 'editor' : authenticated user who joined via invite (not the owner)
  // - 'viewer' : unauthenticated guest (joined via invite link)
  const [sessionRole, setSessionRole] = useState<'owner' | 'editor' | 'viewer' | 'guest'>('viewer');

  // canExport: only owners and editors can download/export content
  const canExport = sessionRole === 'owner' || sessionRole === 'editor';
  // canEdit: owners and editors can draw/modify; viewers/guests are read-only
  const canEdit = sessionRole === 'owner' || sessionRole === 'editor';
  // isReadOnly: legacy flag kept for backward compat with drawing handlers
  const isReadOnly = !canEdit;

  // --- URL Parameters ---
  // specific meeting and room IDs are extracted to connect to the correct session
  const searchParams = new URLSearchParams(location.search);
  const meetingId = searchParams.get('meetingId');
  const roomIdParam = searchParams.get('roomId');

  // --- Canvas Object States ---
  // Local state for various interactive elements on the board
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]); // Yellow sticky notes
  const [textItems, setTextItems] = useState<TextItem[]>([]); // Text labels
  const [croquisItems, setCroquisItems] = useState<CroquisItem[]>([]); // Images/figures

  // --- Selection State ---
  // Tracks which object is currently selected for editing (move, resize, rotate)
  // Unified to handle different types via a single transformer component
  const [selectedObject, setSelectedObject] = useState<{ id: string; type: 'sticky' | 'text' | 'croquis' | 'stroke' } | null>(null);
  const [clipboard, setClipboard] = useState<{ type: 'sticky' | 'text' | 'croquis' | 'stroke'; item: any } | null>(null);

  // Prevent conflicting with existing logic
  // const [selectedCroquisId, setSelectedCroquisId] = useState<string | null>(null); // Replaced by selectedObject

  // Auto-generate guest identity if not authenticated and not already a guest
  // Auto-generate guest identity if not authenticated and not already a guest
  useEffect(() => {
    if (!isAuthenticated && !guestUser) {
      const randomId = crypto.randomUUID();
      setGuestUser({
        guestId: randomId,
        guestName: `Guest ${randomId.slice(0, 4)}`,
        meetingId: meetingId || '',
        roomId: roomIdParam || '',
        role: 'guest'
      });
    }
  }, [isAuthenticated, guestUser, meetingId, roomIdParam, setGuestUser]);

  const [stickyColor, setStickyColor] = useState('#fef3c7'); // Default yellow
  const [canvasBg, setCanvasBg] = useState('#F8F9FA'); // Default canvas bg

  const overlayRef = useRef<HTMLDivElement>(null);
  const croquisLayerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Destructure new view controls
  const {
    canvasRef,
    gridCanvasRef,
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
    drawRemoteStroke,
    drawRemotePoint,
    clearCanvasRemote,
    undoRemote,
    setInitialStrokes,
    scaleRef, // Exposed for math
    strokes,
    updateStroke,
    setStrokes, // Just in case, though usually handled internally
    scale,
    pan,
    zoom,
    setZoomLevel,
    getCanvasPoint,
    offsetRef,
    fillColor,
    setFillColor
  } = useCanvas({
    onDrawStroke: (stroke) => {
      // Broadcast stroke
      sendStroke({ meetingId: meetingId || undefined, stroke });
    },
    onDrawPoint: (point, strokeId, color, width) => {
      // Broadcast point
      sendPoint({ meetingId: meetingId || undefined, point, strokeId, color, width });
    },
    onClear: () => {
      sendClearCanvas({ meetingId: meetingId || undefined });
    },
    onUndo: () => {
      sendUndo({ meetingId: meetingId || undefined });
    },
    onViewUpdate: (scale, offset) => {
      const transform = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`;
      if (overlayRef.current) {
        overlayRef.current.style.transform = transform;
        overlayRef.current.style.transformOrigin = '0 0';
      }
      if (croquisLayerRef.current) {
        croquisLayerRef.current.style.transform = transform;
        croquisLayerRef.current.style.transformOrigin = '0 0';
      }
    },
    onDeleteStroke: (strokeId) => {
      sendDeleteStroke({ meetingId: meetingId || undefined, id: strokeId });
    }
  });

  // NOTE: All socket event handlers are defined in the single useSocket call below,
  // after all useState declarations are in scope. This prevents stale-closure bugs
  // where setters like setParticipants would be undefined at the time of registration.

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [sessionName, setSessionName] = useState("Loading...");
  const [isLocked] = useState(false);
  const [isLoadingMeeting, setIsLoadingMeeting] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [roomId, setRoomId] = useState<string>('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isParticipantsListOpen, setIsParticipantsListOpen] = useState(false);

  // --- Keyboard Shortcuts (Copy / Paste / Delete) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isReadOnly) return; // Disallow guest/viewer modifying the board

      const activeEl = document.activeElement;
      const isInputFocused = activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;
      const isModifierPressed = e.ctrlKey || e.metaKey;

      // Copy
      if (isModifierPressed && e.key.toLowerCase() === 'c') {
        if (isInputFocused) {
          const el = activeEl as HTMLInputElement | HTMLTextAreaElement;
          if (el.selectionStart !== el.selectionEnd) return; // Let native OS copy text
        }

        if (!selectedObject) return;

        let itemToCopy = null;
        if (selectedObject.type === 'sticky') itemToCopy = stickyNotes.find(s => s.id === selectedObject.id);
        else if (selectedObject.type === 'text') itemToCopy = textItems.find(t => t.id === selectedObject.id);
        else if (selectedObject.type === 'croquis') itemToCopy = croquisItems.find(c => c.id === selectedObject.id);
        else if (selectedObject.type === 'stroke') itemToCopy = strokes.find(s => s.id === selectedObject.id);

        if (itemToCopy) {
          setClipboard({ type: selectedObject.type, item: itemToCopy });
          toast({ title: 'Copied', description: 'Item copied to clipboard.', duration: 1500 });
        }
      }

      // Paste
      if (isModifierPressed && e.key.toLowerCase() === 'v') {
        if (isInputFocused && !clipboard) return; // Allow native OS text paste if we have no object

        if (!clipboard) return;

        // If we have an object to paste, we intercept it even in inputs
        if (isInputFocused) {
          activeEl.blur(); // Blur so the user sees the newly pasted object instead
        }

        const newId = crypto.randomUUID();
        const offset = 20; // Visual offset when pasting

        if (clipboard.type === 'sticky') {
          const newItem = { ...clipboard.item, id: newId, x: clipboard.item.x + offset, y: clipboard.item.y + offset };
          setStickyNotes(prev => [...prev, newItem]);
          sendAddSticky({ meetingId: meetingId || undefined, note: newItem });
          setSelectedObject({ id: newId, type: 'sticky' });
        } else if (clipboard.type === 'text') {
          const newItem = { ...clipboard.item, id: newId, x: clipboard.item.x + offset, y: clipboard.item.y + offset };
          setTextItems(prev => [...prev, newItem]);
          sendAddText({ meetingId: meetingId || undefined, item: newItem });
          setSelectedObject({ id: newId, type: 'text' });
        } else if (clipboard.type === 'croquis') {
          const newItem = { ...clipboard.item, id: newId, x: clipboard.item.x + offset, y: clipboard.item.y + offset };
          setCroquisItems(prev => [...prev, newItem]);
          sendAddCroquis({ meetingId: meetingId || undefined, item: newItem });
          setSelectedObject({ id: newId, type: 'croquis' });
        } else if (clipboard.type === 'stroke') {
          const newPoints = clipboard.item.points.map((p: any) => ({ ...p, x: p.x + offset, y: p.y + offset }));
          const newItem = { ...clipboard.item, id: newId, points: newPoints };
          setStrokes((prev: any) => [...prev, newItem]);
          sendStroke({ meetingId: meetingId || undefined, stroke: newItem });
          setSelectedObject({ id: newId, type: 'stroke' });
        }

        toast({ title: 'Pasted', description: 'Item pasted onto canvas.', duration: 1500 });
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isInputFocused) return; // Let user backspace out text naturally
        if (!selectedObject) return;
        if (selectedObject.type === 'sticky') {
          setStickyNotes(prev => prev.filter(n => n.id !== selectedObject.id));
          sendDeleteSticky({ meetingId: meetingId || undefined, id: selectedObject.id });
        } else if (selectedObject.type === 'text') {
          setTextItems(prev => prev.filter(t => t.id !== selectedObject.id));
          sendDeleteText({ meetingId: meetingId || undefined, id: selectedObject.id });
        } else if (selectedObject.type === 'croquis') {
          setCroquisItems(prev => prev.filter(c => c.id !== selectedObject.id));
          sendDeleteCroquis({ meetingId: meetingId || undefined, id: selectedObject.id });
        } else if (selectedObject.type === 'stroke') {
          setStrokes((prev: any) => prev.filter((s: any) => s.id !== selectedObject.id));
          sendDeleteStroke({ meetingId: meetingId || undefined, id: selectedObject.id });
        }
        setSelectedObject(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject, clipboard, stickyNotes, textItems, croquisItems, strokes, isReadOnly, meetingId, toast]);

  // Pan/Zoom State
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Zoom Input State
  const [isEditingZoom, setIsEditingZoom] = useState(false);
  const [zoomInputValue, setZoomInputValue] = useState("55");

  useEffect(() => {
    if (!isEditingZoom) {
      setZoomInputValue((scale * 100).toFixed(0));
    }
  }, [scale, isEditingZoom]);

  const handleZoomCommit = () => {
    let val = parseFloat(zoomInputValue);
    if (isNaN(val)) {
      setZoomInputValue((scale * 100).toFixed(0));
      setIsEditingZoom(false);
      return;
    }
    val = Math.max(5, Math.min(500, val));

    // Zoom to center
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const center = { x: rect.width / 2, y: rect.height / 2 };

    const targetScale = val / 100;
    setZoomLevel(targetScale, center);
    setIsEditingZoom(false);
  };


  // Handle Spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false); // Stop panning if space released
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse Handlers
  // --- Interaction Handlers ---

  /**
   * Handles the start of a user interaction on the canvas (Mouse Down).
   * dependent on the selected tool:
   * - Brush/Eraser: Starts drawing a stroke.
   * - Select: Starts a selection box or selects an object under cursor.
   * - Pan: Starts moving the view.
   */
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If clicking on UI, ignore (usually handled by stopProp, but just in case)
    // Middle mouse or Spacebar -> Pan
    if (e.button === 1 || isSpacePressed) {
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button !== 0) return;

    // Sticky Note Tool
    if (tool === 'sticky') {
      const point = getCanvasPoint(e);
      if (point) {
        const newNote: StickyNote = {
          id: crypto.randomUUID(),
          x: point.x - 100, // Center
          y: point.y - 100,
          text: '',
          color: stickyColor,
          width: 200,
          height: 200
        };
        setStickyNotes(prev => [...prev, newNote]);
        setTool('select');
        sendAddSticky({
          meetingId: meetingId || undefined,
          note: newNote
        });
      }
      return;
    }

    // Text Tool
    if (tool === 'text') {
      const point = getCanvasPoint(e);
      if (point) {
        const newText: TextItem = {
          id: crypto.randomUUID(),
          x: point.x,
          y: point.y - 12,
          text: '',
          color: brushColor,
          fontSize: 24
        };
        setTextItems(prev => [...prev, newText]);
        setTool('select');
        sendAddText({
          meetingId: meetingId || undefined,
          item: newText
        });
      }
      return;
    }

    // Select Tool handled by falling through to elements or Pan?


    // Select Tool handled by falling through to elements or Pan?
    if (tool === 'select') {
      const point = getCanvasPoint(e);
      if (!point) return;

      // Hit Test Strokes (since HTML elements handle their own clicks, we only check strokes here if bubbling reached us?)
      // Actually, if we click an HTML element, we want IT to be selected.
      // But HTML elements stop propagation usually?
      // Let's implement hit testing for strokes here.

      // Rudimentary Hit Test for Strokes
      // Iterate in reverse to find top-most
      // Hit Test Strokes - Increased threshold for better UX
      const hitStroke = [...strokes].reverse().find(s => {
        if (s.isFill) {
          return isPointInPolygon({ x: point.x, y: point.y }, s.points);
        }
        const threshold = 20 / scale;
        return s.points.some(p => Math.hypot(p.x - point.x, p.y - point.y) < threshold);
      });

      if (hitStroke) {
        setSelectedObject({ id: hitStroke.id, type: 'stroke' });
        // Stop panning if we selected something?
        // But usually we want to drag it immediately?
        // For now, let's just select.
        return;
      }

      // If clicked on nothing:
      setSelectedObject(null);

      // Allow Pan
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Left click -> Draw
    handleStartDrawing(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      pan(dx, dy);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }
    handleDraw(e);
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    stopDrawing();
  };

  // Sticky Note Actions
  const handleNoteChange = (id: string, text: string) => {
    setStickyNotes(prev => prev.map(n => n.id === id ? { ...n, text } : n));
    sendUpdateSticky({
      meetingId: meetingId || undefined,
      id,
      updates: { text }
    });
  };

  const handleNoteDelete = (id: string) => {
    setStickyNotes(prev => prev.filter(n => n.id !== id));
    sendDeleteSticky({
      meetingId: meetingId || undefined,
      id
    });
  };

  // Text Actions
  const handleTextChange = (id: string, text: string) => {
    setTextItems(prev => prev.map(t => t.id === id ? { ...t, text } : t));
    sendUpdateText({
      meetingId: meetingId || undefined,
      id,
      updates: { text }
    });
  };

  const handleTextDelete = (id: string) => {
    setTextItems(prev => prev.filter(t => t.id !== id));
    sendDeleteText({
      meetingId: meetingId || undefined,
      id
    });
  };

  // Croquis Actions
  /**
   * Adds a Croquis (Fashion Template) to the canvas.
   * Loads the image, centers it in the viewport, and emits the event to other users.
   */
  const handleAddCroquis = (src: string) => {
    const dpr = window.devicePixelRatio || 1;
    // Calculate center of view
    const canvasWidth = canvasRef.current ? canvasRef.current.width / dpr : window.innerWidth;
    const canvasHeight = canvasRef.current ? canvasRef.current.height / dpr : window.innerHeight;

    if (!offsetRef.current) return;

    const viewCenterX = -offsetRef.current.x / scale + (canvasWidth / scale / 2);
    const viewCenterY = -offsetRef.current.y / scale + (canvasHeight / scale / 2);

    const newItem: CroquisItem = {
      id: crypto.randomUUID(),
      src,
      x: viewCenterX - 150,
      y: viewCenterY - 300,
      width: 300,
      height: 600,
      opacity: 0.9,
      isLocked: false,
      isFlipped: false
    };

    setCroquisItems(prev => [...prev, newItem]);
    setSelectedObject({ id: newItem.id, type: 'croquis' });
    setTool('select');

    // Broadcast
    sendAddCroquis({
      meetingId: meetingId || undefined,
      item: newItem
    });
  };

  const updateCroquis = (id: string, updates: Partial<CroquisItem>) => {
    setCroquisItems(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));

    // Broadcast
    sendUpdateCroquis({
      meetingId: meetingId || undefined,
      id,
      updates
    });
  };

  // Native Event Listeners for Non-Passive behavior
  const lastTouchPos = useRef<{ x: number, y: number } | null>(null);
  const lastTouchDistance = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      // Always prevent browser zoom
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomSensitivity = -0.003;
        const delta = e.deltaY * zoomSensitivity;

        // Calculate center relative to the canvas container
        const rect = container.getBoundingClientRect();
        const centerX = e.clientX - rect.left;
        const centerY = e.clientY - rect.top;
        zoom(delta, { x: centerX, y: centerY });
        return;
      }

      // Panning - only if targeting canvas area
      // We check if the target is likely the canvas or overlay, not a UI button/panel
      const target = e.target as HTMLElement;
      // Check if target is inside a scrollable container in the UI (e.g. chat messages)
      const scrollable = target.closest('.overflow-y-auto');
      if (scrollable) return; // Let default scroll happen

      // If we are over the canvas area
      if (target.tagName === 'CANVAS' || target === overlayRef.current || target === contentRef.current || target.classList.contains('bg-canvas-bg') || target === container) {
        e.preventDefault();
        pan(-e.deltaX, -e.deltaY);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault(); // Prevent default immediately
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        lastTouchPos.current = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        lastTouchDistance.current = dist;
        return;
      }
      lastTouchPos.current = null;
      lastTouchDistance.current = null;

      // If hitting UI, don't draw
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('.ui-panel')) return;

      if (isReadOnly) {
        setShowLoginPrompt(true);
        return;
      }
      startDrawing(e as unknown as React.TouchEvent);
    };

    const onTouchMove = (e: TouchEvent) => {
      // Always prevent default to stop scrolling/zooming the whole page
      if (e.cancelable) e.preventDefault();

      if (e.touches.length === 2) {
        if (!lastTouchPos.current) return;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const centerX = (t1.clientX + t2.clientX) / 2;
        const centerY = (t1.clientY + t2.clientY) / 2;

        // Pan
        const dx = centerX - lastTouchPos.current.x;
        const dy = centerY - lastTouchPos.current.y;
        pan(dx, dy);

        // Zoom
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        if (lastTouchDistance.current !== null && dist > 0) {
          const currentScale = scaleRef.current || 1;
          const ratio = dist / lastTouchDistance.current;
          const delta = currentScale * (ratio - 1);

          const rect = container.getBoundingClientRect();
          zoom(delta, { x: centerX - rect.left, y: centerY - rect.top });
        }

        lastTouchPos.current = { x: centerX, y: centerY };
        lastTouchDistance.current = dist;
        return;
      }
      if (isReadOnly) return;
      draw(e as unknown as React.TouchEvent);
    };

    const onTouchEnd = (e: TouchEvent) => {
      stopDrawing();
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [pan, zoom, startDrawing, draw, stopDrawing, isReadOnly]);


  // --- Socket Event Handlers ---
  /**
   * Initialize the Socket.io connection and define event listeners.
   * This handles all real-time updates from the server, such as:
   * - Users joining/leaving.
   * - Drawing updates (strokes, points).
   * - Object updates (sticky notes, text, croquis).
   * - Chat messages.
   */
  useSocket({
    // Participant tracking — all three events that the server can emit
    onParticipantsList: (users) => {
      // Only keep users with an active socketId (currently connected)
      const online = users.filter((u: any) => !!u.socketId);
      console.log('📋 Participants list:', online.length, 'online');
      setParticipants(online);
    },
    onRoomJoined: (data) => {
      const online = (data.participants ?? []).filter((u: any) => !!u.socketId);
      console.log('🎉 Room joined:', online.length, 'online participants');
      setParticipants(online);
    },
    onUserJoined: (data) => {
      const online = (data.participants ?? []).filter((u: any) => !!u.socketId);
      console.log('👋 User joined, now online:', online.length);
      setParticipants(online);
    },
    onUserLeft: (data) => {
      const online = (data.participants ?? []).filter((u: any) => !!u.socketId);
      console.log('👋 User left, now online:', online.length);
      setParticipants(online);
    },
    onCanvasUpdated: (data) => { console.log('Canvas updated', data); },
    onStrokeDrawn: (data) => drawRemoteStroke(data.stroke),
    onPointDrawn: (data) => drawRemotePoint(data.point, data.strokeId, data.color, data.width),
    onCanvasCleared: () => {
      clearCanvasRemote();
      setStickyNotes([]);
      setTextItems([]);
      setCroquisItems([]);
    },
    onStrokeUndone: () => undoRemote(),
    onChatHistory: (history) => {
      setMessages(history.map((msg: any) => ({
        id: msg._id,
        userId: msg.userId || msg.guestId,
        guestId: msg.guestId,
        userName: msg.userName || 'Anonymous',
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      })));
    },
    // Fires only for OTHER users' messages (backend emits to everyone except sender)
    onReceiveMessage: (msg: any) => {
      setMessages(prev => {
        // Guard against duplicate DB IDs (shouldn't happen but be safe)
        if (prev.some(m => m.id === msg._id)) return prev;

        // Use a functional timeout to evaluate current isChatOpen state outside of the ref boundary
        setTimeout(() => {
          setUnreadChatCount(prevCount => {
            // We increment unread count if the chat drawer is currently visually closed
            return !isChatOpen ? prevCount + 1 : 0;
          });
        }, 0);

        return [...prev, {
          id: msg._id,
          userId: msg.userId || msg.guestId,
          guestId: msg.guestId,
          userName: msg.userName || 'Anonymous',
          content: msg.content,
          timestamp: new Date(msg.timestamp)
        }];
      });
    },
    // Fires only for the SENDER after their message is saved to DB
    onMessageConfirmed: (msg: any) => {
      setMessages(prev => {
        // Replace the optimistic (tempId) entry with the confirmed DB message.
        // Match by content + isPending flag since we don't have the DB id yet.
        const optimisticIndex = prev.findIndex(m => m.isPending && m.content === msg.content);
        if (optimisticIndex !== -1) {
          const updated = [...prev];
          updated[optimisticIndex] = {
            id: msg._id,
            userId: msg.userId || msg.guestId,
            guestId: msg.guestId,
            userName: msg.userName || 'Anonymous',
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            isPending: false,
          };
          return updated;
        }
        // Fallback: if optimistic entry not found, just append (shouldn't happen)
        if (prev.some(m => m.id === msg._id)) return prev;
        return [...prev, {
          id: msg._id,
          userId: msg.userId || msg.guestId,
          guestId: msg.guestId,
          userName: msg.userName || 'Anonymous',
          content: msg.content,
          timestamp: new Date(msg.timestamp),
        }];
      });
    },
    onCroquisAdded: (data) => {
      setCroquisItems(prev => {
        if (prev.some(item => item.id === data.item.id)) return prev;
        return [...prev, data.item];
      });
    },
    onCroquisUpdated: (data) => {
      setCroquisItems(prev => prev.map(c => c.id === data.id ? { ...c, ...data.updates } : c));
    },
    onStickyAdded: (data) => {
      setStickyNotes(prev => {
        if (prev.some(note => note.id === data.note.id)) return prev;
        return [...prev, data.note];
      });
    },
    onStickyUpdated: (data) => {
      setStickyNotes(prev => prev.map(n => n.id === data.id ? { ...n, ...data.updates } : n));
    },
    onStickyDeleted: (data) => {
      setStickyNotes(prev => prev.filter(n => n.id !== data.id));
    },
    onTextAdded: (data) => {
      setTextItems(prev => {
        if (prev.some(item => item.id === data.item.id)) return prev;
        return [...prev, data.item];
      });
    },
    onTextUpdated: (data) => {
      setTextItems(prev => prev.map(t => t.id === data.id ? { ...t, ...data.updates } : t));
    },
    onTextDeleted: (data) => {
      setTextItems(prev => prev.filter(t => t.id !== data.id));
    },
    onStrokeUpdated: (data) => {
      updateStroke(data.id, data.updates);
    },
    onStrokeDeleted: (data) => {
      setStrokes(prev => prev.filter(s => s.id !== data.id));
    },
    onCanvasState: (data) => {
      setInitialStrokes(data.strokes);
      if (data.croquis) setCroquisItems(data.croquis);
      if (data.stickyNotes) setStickyNotes(data.stickyNotes);
      if (data.textItems) setTextItems(data.textItems);
      // Restore background color saved by the server
      if (data.backgroundColor) setCanvasBg(data.backgroundColor);
    },
    // Fires when another user changes the canvas background colour
    onCanvasBackgroundChanged: ({ color }) => {
      setCanvasBg(color);
    },
  });

  // Fetch meeting data & resolve session role
  useEffect(() => {
    const fetchMeeting = async () => {
      if (!meetingId) {
        setSessionName("Untitled Session");
        // No meetingId → treat authenticated users as editors of a scratch session
        setSessionRole(isAuthenticated ? 'editor' : 'viewer');
        setIsLoadingMeeting(false);
        return;
      }
      try {
        let meeting;
        if (isAuthenticated) {
          meeting = await meetingsAPI.getById(meetingId);
        } else {
          meeting = await meetingsAPI.getPublicById(meetingId);
        }
        setSessionName(meeting.title);

        // --- Resolve session role from ownership ---
        // The backend returns createdBy as the owner's user ID string.
        // If the authenticated user matches the owner → 'owner'.
        // If authenticated but not the owner → 'editor' (invited collaborator).
        // If not authenticated → 'viewer' (guest via invite link).
        if (isAuthenticated && user) {
          const ownerId = typeof meeting.createdBy === 'string'
            ? meeting.createdBy
            : (meeting.createdBy as any)?._id;
          setSessionRole(user._id === ownerId ? 'owner' : 'editor');
        } else if (isGuest) {
          setSessionRole('guest');
        } else {
          setSessionRole('viewer');
        }
      } catch (error) {
        console.error('Error fetching meeting:', error);
        setSessionName("Untitled Session");
        setSessionRole(isAuthenticated ? 'editor' : 'viewer');
      } finally {
        setIsLoadingMeeting(false);
      }
    };
    fetchMeeting();
  }, [meetingId, isAuthenticated, isGuest, user]);

  // Join Room
  useEffect(() => {
    if (!meetingId) return;
    const roomIdToJoin = roomIdParam || `room-${meetingId}`;
    setRoomId(roomIdToJoin);
    joinRoom({
      roomId: roomIdToJoin,
      meetingId,
      userId: user?._id,
      guestId: guestUser?.guestId,
      name: user?.name || guestUser?.guestName || 'Anonymous',
      role: user ? 'owner' : 'guest',
    });
    if (meetingId) requestCanvasState({ meetingId });
    return () => leaveRoom();
  }, [meetingId, roomIdParam, user, guestUser]);

  const handleEditAttempt = () => {
    if (isReadOnly) {
      setShowLoginPrompt(true);
      return false;
    }
    return true;
  };

  const handleStartDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!handleEditAttempt()) return;
    startDrawing(e);
  };
  const handleDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (isReadOnly) return;
    draw(e);
  };
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const handleClearCanvas = () => {
    if (!handleEditAttempt()) return;
    setShowResetConfirm(true);
  };

  const confirmClearCanvas = async () => {
    clearCanvas();
    setStickyNotes([]);
    setTextItems([]);
    setCroquisItems([]);

    // Update thumbnail in DB to reflect empty canvas
    // Wait for render cycle to clear canvas visually
    setTimeout(async () => {
      if (meetingId && containerRef.current) {
        try {
          const canvas = await html2canvas(containerRef.current, {
            scale: 0.2, // Small scale for thumbnail
            useCORS: true,
            backgroundColor: canvasBg || '#ffffff',
            logging: false,
          });
          const thumbnail = canvas.toDataURL('image/jpeg', 0.6);
          await meetingsAPI.update(meetingId, { thumbnail });
          console.log('Thumbnail updated (cleared)');
        } catch (error) {
          console.error('Failed to update thumbnail:', error);
        }
      }
    }, 500);
  };

  const handleUndo = () => {
    if (!handleEditAttempt()) return;
    undo();
  };

  /**
   * Sets the canvas background colour:
   * - Applies it locally (optimistic).
   * - Emits 'set-canvas-background' so the server persists it and
   *   broadcasts 'canvas-background-changed' to every other participant.
   */
  const handleSetCanvasBg = (color: string) => {
    setCanvasBg(color);
    sendCanvasBackground({ meetingId: meetingId || undefined, color });
  };

  const handleSendMessage = (content: string) => {
    const tempId = `temp-${Date.now()}`;
    const currentUserName = user?.name || guestUser?.guestName || 'Anonymous';
    const currentUserId = user?._id || guestUser?.guestId || '';

    // Optimistically add the message to the UI immediately
    const optimisticMessage = {
      id: tempId,
      tempId,
      userId: currentUserId,
      guestId: guestUser?.guestId,
      userName: currentUserName,
      content,
      timestamp: new Date(),
      isPending: true,
    };
    setMessages(prev => [...prev, optimisticMessage]);

    // Emit to server — server will fire 'message-confirmed' back to sender
    sendMessage({
      meetingId: meetingId || undefined,
      userId: user?._id,
      guestId: guestUser?.guestId,
      name: currentUserName,
      content
    });
  };

  // --- Object Selection & Manipulation Logic ---

  // Update object properties
  const handleObjectUpdate = (updates: { x?: number; y?: number; width?: number; height?: number; rotation?: number }) => {
    if (!selectedObject) return;

    if (selectedObject.type === 'sticky') {
      setStickyNotes(prev => prev.map(n => n.id === selectedObject.id ? { ...n, ...updates } : n));
      sendUpdateSticky({ meetingId: meetingId || undefined, id: selectedObject.id, updates });
    } else if (selectedObject.type === 'text') {
      const oldItem = textItems.find(t => t.id === selectedObject.id);
      let nextUpdates: any = { ...updates };
      // Text specifically should scale font size when the bounding box height is dragged
      if (oldItem && updates.height && oldItem.height) {
        const scale = updates.height / oldItem.height;
        nextUpdates.fontSize = (oldItem.fontSize || 24) * scale;
      }
      setTextItems(prev => prev.map(t => t.id === selectedObject.id ? { ...t, ...nextUpdates } : t));
      sendUpdateText({ meetingId: meetingId || undefined, id: selectedObject.id, updates: nextUpdates });
    } else if (selectedObject.type === 'croquis') {
      updateCroquis(selectedObject.id, updates);
    } else if (selectedObject.type === 'stroke') {
      const stroke = strokes.find(s => s.id === selectedObject.id);
      if (stroke) {
        // Calculate interactions
        // If x/y changed, shift points
        const currentBounds = getStrokeBounds(stroke);
        const { width: newWidth, height: newHeight, rotation, ...restUpdates } = updates;

        const targetX = (updates.x !== undefined) ? updates.x : currentBounds.x;
        const targetY = (updates.y !== undefined) ? updates.y : currentBounds.y;

        let newPoints = stroke.points;
        const widthChanged = newWidth !== undefined && newWidth !== currentBounds.width;
        const heightChanged = newHeight !== undefined && newHeight !== currentBounds.height;

        let scaleX = 1;
        let scaleY = 1;

        const w1 = currentBounds.width || 1;
        const h1 = currentBounds.height || 1;

        if (widthChanged) scaleX = newWidth / w1;
        if (heightChanged) scaleY = newHeight / h1;

        if (updates.x !== undefined || updates.y !== undefined || widthChanged || heightChanged) {
          newPoints = stroke.points.map(p => ({
            x: (p.x - currentBounds.x) * scaleX + targetX,
            y: (p.y - currentBounds.y) * scaleY + targetY,
          }));
        }

        const newTargetW = newWidth ?? currentBounds.width;
        const newTargetH = newHeight ?? currentBounds.height;

        const finalStrokeUpdates: any = {
          ...restUpdates, // Rest updates safely contain x/y but NOT width/height.
          points: newPoints,
          center: { x: targetX + newTargetW / 2, y: targetY + newTargetH / 2 }
        };

        if (rotation !== undefined) {
          finalStrokeUpdates.rotation = rotation;
        }

        updateStroke(selectedObject.id, finalStrokeUpdates);
        sendUpdateStroke({
          meetingId: meetingId || undefined,
          id: selectedObject.id,
          updates: finalStrokeUpdates
        });
      }
    }
  };

  // Delete object
  const handleObjectDelete = () => {
    if (!selectedObject) return;
    if (selectedObject.type === 'sticky') handleNoteDelete(selectedObject.id);
    if (selectedObject.type === 'text') handleTextDelete(selectedObject.id);
    if (selectedObject.type === 'croquis') {
      setCroquisItems(prev => prev.filter(c => c.id !== selectedObject.id));
      sendDeleteCroquis({
        meetingId: meetingId || undefined,
        id: selectedObject.id
      });
    }
    if (selectedObject.type === 'stroke') {
      setStrokes(prev => prev.filter(s => s.id !== selectedObject.id));
    }
    setSelectedObject(null);
  };

  // Delete key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't delete if typing in an input or textarea
      if (document.activeElement instanceof HTMLTextAreaElement || document.activeElement instanceof HTMLInputElement) {
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObject && !isEditingZoom) {
        handleObjectDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject, isEditingZoom]);

  // Calculate Stroke Bounds
  const getStrokeBounds = (stroke: Stroke) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    stroke.points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });
    // Fallback for single point
    if (minX === Infinity) return { x: 0, y: 0, width: 0, height: 0, rotation: 0 };

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, rotation: stroke.rotation || 0 };
  };

  // Derive active transformer props
  let activeTransformerProps = null;
  if (selectedObject) {
    if (selectedObject.type === 'sticky') {
      const item = stickyNotes.find(i => i.id === selectedObject.id);
      if (item) activeTransformerProps = { ...item, width: item.width || 200, height: item.height || 200, rotation: item.rotation || 0 };
    } else if (selectedObject.type === 'text') {
      const item = textItems.find(i => i.id === selectedObject.id);
      if (item) activeTransformerProps = { ...item, width: item.width || 200, height: item.height || 50, rotation: item.rotation || 0 };
    } else if (selectedObject.type === 'croquis') {
      const item = croquisItems.find(i => i.id === selectedObject.id);
      if (item) activeTransformerProps = { ...item, rotation: item.rotation || 0 };
    } else if (selectedObject.type === 'stroke') {
      const item = strokes.find(i => i.id === selectedObject.id);
      if (item) activeTransformerProps = getStrokeBounds(item);
    }
  }

  const handleExport = async () => {
    // --- Permission Check ---
    // Only owners and editors are allowed to export the canvas as an image.
    if (!canExport) {
      toast({
        title: 'Export not allowed',
        description: sessionRole === 'guest'
          ? 'Guests cannot export. Please sign in to unlock export.'
          : 'Viewers cannot export this session.',
        variant: 'destructive',
      });
      return;
    }

    // Clear selection to avoid capturing controls
    setSelectedObject(null);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!contentRef.current) return;

    try {
      // Use html2canvas to capture the entire composition
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Save thumbnail — only the session owner updates the stored thumbnail
      if (meetingId && sessionRole === 'owner') {
        try {
          const thumbCanvas = await html2canvas(contentRef.current, {
            scale: 0.2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
          });
          const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.6);
          await meetingsAPI.update(meetingId, { thumbnail });
        } catch (err) {
          console.error("Failed to update thumbnail", err);
        }
      }

      const link = document.createElement('a');
      link.download = `${sessionName.replace(/\s+/g, '-').toLowerCase()}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleShare = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    setShowShareModal(true);
  };


  const handleOpenImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedSrc = canvas.toDataURL('image/jpeg', 0.7);
          handleAddCroquis(compressedSrc);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
    // Reset inputs
    e.target.value = '';
  };

  const handleSaveTo = () => {
    // --- Permission Check ---
    // Exporting the raw .hive.json file is restricted to owners only.
    // Editors can export image (PNG/JPG) but full data export is owner-only.
    if (!canExport) {
      toast({
        title: 'Save not allowed',
        description: sessionRole === 'guest'
          ? 'Guests cannot save project files. Please sign in.'
          : 'Only the session owner and editors can save project files.',
        variant: 'destructive',
      });
      return;
    }

    const data = {
      version: 1,
      timestamp: Date.now(),
      title: sessionName,
      exportedBy: user?.name || 'Unknown',
      sessionRole,       // Record who exported and their role
      meetingId: meetingId || null,
      canvasBg,
      strokes,
      stickyNotes,
      textItems,
      croquisItems
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sessionName.replace(/\s+/g, '-').toLowerCase()}.hive.json`;
    link.click();
    URL.revokeObjectURL(url);
  };


  return (
    <div ref={containerRef} className="h-screen flex flex-col overflow-hidden relative touch-none overscroll-none" style={{ backgroundColor: canvasBg }}>
      {isReadOnly && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 text-yellow-950 px-4 py-2 text-center text-sm font-medium">
          <Eye className="w-4 h-4 inline mr-2" />
          You're viewing in read-only mode.
          <button onClick={() => setShowLoginPrompt(true)} className="ml-2 underline font-semibold">Login to edit</button>
        </div>
      )}

      <motion.header className={`absolute top-0 left-0 right-0 p-2 md:p-4 flex flex-col sm:flex-row items-start justify-between gap-2 z-40 pointer-events-none ${isReadOnly ? 'mt-10' : ''}`}>
        <div className="flex items-center gap-2 md:gap-4 pointer-events-auto backdrop-blur-md border border-[rgb(95,74,139)] shadow-sm rounded-2xl px-2 md:px-3 py-1.5 md:py-2 w-full sm:w-auto overflow-hidden text-ellipsis whitespace-nowrap" style={{ backgroundColor: 'rgba(95, 74, 139, 0.75)' }}>
          <button onClick={async () => {
            if (meetingId && isAuthenticated && contentRef.current) {
              try {
                const thumbCanvas = await html2canvas(contentRef.current, {
                  scale: 0.2,
                  useCORS: true,
                  backgroundColor: '#ffffff',
                  logging: false,
                });
                const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.6);
                await meetingsAPI.update(meetingId, { thumbnail });
              } catch (e) { console.error(e); }
            }
            navigate(isAuthenticated ? "/home" : "/");
          }} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center overflow-hidden border-2 border-black/20 shrink-0">
              <img src={logo} alt="HiveBoard Logo" className="w-full h-full object-cover" />
            </div>
          </button>
          <div className="h-5 w-px bg-[rgb(245,244,235)]/20 shrink-0" />
          <div className="flex items-center gap-2 shrink-0 truncate max-w-[150px] md:max-w-[300px]">
            {isLoadingMeeting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[rgb(245,244,235)]" />
                <span className="font-display font-semibold text-sm text-[rgb(245,244,235)]">Loading...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 truncate"><h1 className="font-display font-semibold text-sm select-none text-[rgb(255,212,29)] truncate">{sessionName}</h1>{isLocked && <Lock className="w-3 h-3 text-[rgb(245,244,235)] shrink-0" />}</div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 pointer-events-auto backdrop-blur-md border border-[rgb(95,74,139)] shadow-sm rounded-2xl px-2 py-1.5 flex-wrap justify-end" style={{ backgroundColor: 'rgba(95, 74, 139, 0.75)' }}>
            {/* Zoom Controls moved here */}
            <div className="flex items-center gap-1 border-r border-white/20 pr-2 mr-1">
              <button
                onClick={() => {
                  const canvas = canvasRef.current;
                  if (canvas) {
                    const rect = canvas.getBoundingClientRect();
                    zoom(-0.1, { x: rect.width / 2, y: rect.height / 2 });
                  }
                }}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-[rgb(245,244,235)]"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="text"
                value={isEditingZoom ? zoomInputValue : `${(scale * 100).toFixed(0)}%`}
                onChange={(e) => {
                  setIsEditingZoom(true);
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setZoomInputValue(val);
                }}
                onBlur={handleZoomCommit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleZoomCommit();
                    e.currentTarget.blur();
                  }
                }}
                className="w-10 text-center bg-transparent border-none outline-none font-semibold text-xs select-none p-0 focus:ring-0 text-[rgb(245,244,235)]"
              />
              <button
                onClick={() => {
                  const canvas = canvasRef.current;
                  if (canvas) {
                    const rect = canvas.getBoundingClientRect();
                    zoom(0.1, { x: rect.width / 2, y: rect.height / 2 });
                  }
                }}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-[rgb(245,244,235)]"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            {/* End Zoom Controls */}
            <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-[rgb(245,244,235)] hover:text-white hover:bg-white/10" onClick={handleOpenImage} title="Add Image"><ImagePlus className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-[rgb(245,244,235)] hover:text-white hover:bg-white/10" onClick={handleShare} title="Share"><Share2 className="w-4 h-4" /></Button>
            {/* Export button — visible to all but disabled for viewers/guests with a tooltip */}
            <Button
              variant="ghost"
              size="icon-sm"
              className={`h-8 w-8 hover:bg-white/10 transition-opacity ${canExport
                ? 'text-[rgb(245,244,235)] hover:text-white'
                : 'text-[rgb(245,244,235)]/40 cursor-not-allowed'
                }`}
              onClick={handleExport}
              title={canExport ? 'Export canvas as image' : `Export is restricted (you are a ${sessionRole})`}
              id="btn-export-image"
            >
              {canExport ? <Download className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-[rgb(245,244,235)] hover:text-white hover:bg-white/10"><MoreHorizontal className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 bg-white/95 backdrop-blur-md border-gray-200">
                <DropdownMenuItem>
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Open
                  <DropdownMenuShortcut>Ctrl+O</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleSaveTo}
                  disabled={!canExport}
                  className={!canExport ? 'opacity-40 cursor-not-allowed' : ''}
                  id="menu-save-to"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Save to...
                  {!canExport && <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wide">Owner/Editor only</span>}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExport}
                  disabled={!canExport}
                  className={!canExport ? 'opacity-40 cursor-not-allowed' : ''}
                  id="menu-export-image"
                >
                  <ImageDown className="w-4 h-4 mr-2" />
                  Export image...
                  <DropdownMenuShortcut>Ctrl+Shift+E</DropdownMenuShortcut>
                  {!canExport && <span className="ml-1 text-[10px] text-muted-foreground uppercase tracking-wide">Owner/Editor only</span>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-violet-600 focus:text-violet-700 focus:bg-violet-50">
                  <Command className="w-4 h-4 mr-2" />
                  Command palette
                  <DropdownMenuShortcut>Ctrl+/</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Search className="w-4 h-4 mr-2" />
                  Find on canvas
                  <DropdownMenuShortcut>Ctrl+F</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CircleHelp className="w-4 h-4 mr-2" />
                  Help
                  <DropdownMenuShortcut>?</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleClearCanvas} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reset the canvas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Palette className="w-4 h-4 mr-2" />
                    Canvas background color
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="p-2 min-w-[10rem]">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-2 px-0.5">Background Color</p>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { color: '#F8F9FA', label: 'Default' },
                        { color: '#ffffff', label: 'White' },
                        { color: '#1a1a1a', label: 'Dark' },
                        { color: '#2d2d2d', label: 'Darker' },
                        { color: '#fffbeb', label: 'Warm' },
                        { color: '#FFF3DC', label: 'Light Cream' },
                        { color: '#FFF0F3', label: 'Blush Pink' },
                        { color: '#FAEEF1', label: 'Light Burgundy' },
                        { color: '#F0FAF4', label: 'Pale Emerald' },
                        { color: '#F0F3FF', label: 'Very Light Navy' },
                      ].map(({ color, label }) => (
                        <button
                          key={color}
                          title={label}
                          className={cn(
                            "w-6 h-6 rounded-full border border-border shadow-sm hover:scale-110 transition-transform",
                            canvasBg === color && "ring-2 ring-primary ring-offset-1"
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => handleSetCanvasBg(color)}
                        />
                      ))}
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>

            {!isAuthenticated && (
              <Button variant="elegant" size="sm" className="h-8 text-xs ml-2 px-2 sm:px-3" asChild>
                <Link to="/auth" state={{ from: location }}>
                  <LogIn className="w-3 h-3 sm:mr-1.5" />
                  <span className="hidden sm:inline">Sign In</span>
                </Link>
              </Button>
            )}
          </div>
          {/* UserPresence removed/moved from here */}
        </div>
      </motion.header >

      {/* Participants / UserPresence Sidebar on the Right */}
      < div className="fixed right-2 sm:right-4 top-40 sm:top-24 flex flex-col gap-2 z-40 pointer-events-none" >
        <div className="pointer-events-auto backdrop-blur-md border border-[rgb(95,74,139)] shadow-sm rounded-2xl p-1" style={{ backgroundColor: 'rgba(95, 74, 139, 0.75)' }}>
          <UserPresence
            users={participants.map((p, i) => ({ id: p.userId || p.guestId || p.socketId, name: p.name, role: p.isOwner ? 'owner' : (p.userId ? 'editor' : 'viewer'), color: PRESENCE_COLORS[i % PRESENCE_COLORS.length], isOnline: true }))}
            currentUserId={user?._id || guestUser?.guestId || ''}
            onClick={() => setIsParticipantsListOpen(!isParticipantsListOpen)}
            vertical={true}
            maxVisible={4}
          />
        </div>
      </div >

      <div ref={contentRef} className="flex-1 relative overflow-hidden bg-canvas-bg"
        style={{
          cursor: tool === 'brush' ? 'crosshair' :
            tool === 'text' ? 'text' :
              tool === 'fill' ? `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"/><path d="m5 2 5 5"/><path d="M2 13h15"/><path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z"/></svg>') 0 24, auto` :
                tool === 'eraser' ? `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>') 0 24, auto` :
                  'default'
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
        {/* HTML Overlay (Stickies/Text) - Z-20 */}
        <div ref={overlayRef} className="absolute inset-0 pointer-events-none z-20" style={{ transformOrigin: '0 0' }}>
          {stickyNotes.map(note => (
            <div key={note.id}
              className="absolute p-4 shadow-md transition-shadow cursor-grab active:cursor-grabbing pointer-events-auto"
              style={{
                left: note.x, top: note.y, width: note.width || 200, height: note.height || 200, backgroundColor: note.color,
                transform: `rotate(${note.rotation || 0}rad)`
              }}
              onMouseDown={(e) => {
                if (tool === 'select') {
                  e.stopPropagation();
                  setSelectedObject({ id: note.id, type: 'sticky' });
                }
              }}
            >
              <textarea
                value={note.text}
                onChange={(e) => handleNoteChange(note.id, e.target.value)}
                className="w-full h-full bg-transparent resize-none border-none outline-none font-handwriting text-lg"
                placeholder="Type here..."
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (tool === 'select') {
                    setSelectedObject({ id: note.id, type: 'sticky' });
                  }
                }}
              />
              {selectedObject?.id === note.id && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-popover/95 backdrop-blur border border-border rounded-xl shadow-xl flex items-center p-1.5 gap-2 z-50 pointer-events-auto" onMouseDown={e => e.stopPropagation()}>
                  <button type="button" onClick={() => {
                    setStickyNotes(prev => prev.filter(n => n.id !== note.id));
                    setSelectedObject(null);
                  }} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-destructive" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          ))}
          {textItems.map(item => (
            <div key={item.id}
              className="absolute pointer-events-auto cursor-grab active:cursor-grabbing"
              style={{ left: item.x, top: item.y, width: item.width, height: item.height, color: item.color, fontSize: item.fontSize, transform: `rotate(${item.rotation || 0}rad)` }}
              onMouseDown={(e) => {
                if (tool === 'select') {
                  e.stopPropagation();
                  setSelectedObject({ id: item.id, type: 'text' });
                }
              }}
            >
              <input
                value={item.text}
                onChange={(e) => handleTextChange(item.id, e.target.value)}
                className="bg-transparent border-none outline-none"
                style={{ color: item.color, fontSize: item.fontSize, minWidth: '50px' }}
                placeholder="Type..."
              />
            </div>
          ))}

          {/* Render Selection Transformer Overlay */}
          {tool === 'select' && activeTransformerProps && selectedObject && (
            <SelectTransformer
              x={activeTransformerProps.x}
              y={activeTransformerProps.y}
              width={activeTransformerProps.width}
              height={activeTransformerProps.height}
              rotation={activeTransformerProps.rotation}
              scale={scale}
              onUpdate={handleObjectUpdate}
              onDelete={handleObjectDelete}
            />
          )}

        </div>

        {/* Croquis Layer - Z-1 */}
        <div ref={croquisLayerRef} className="absolute inset-0 pointer-events-none z-1" style={{ transformOrigin: '0 0' }}>
          {croquisItems.map(item => (
            <div key={item.id} className={`absolute group pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`} style={{ left: item.x, top: item.y, width: item.width, height: item.height, opacity: item.opacity, transform: `rotate(${item.rotation || 0}rad) scaleX(${item.isFlipped ? -1 : 1})` }}
              onMouseDown={(e) => {
                if (tool !== 'select' || item.isLocked) return;
                if (e.button !== 0) return;
                e.stopPropagation();
                setSelectedObject({ id: item.id, type: 'croquis' });
                const startX = e.clientX;
                const startY = e.clientY;
                const startItemX = item.x;
                const startItemY = item.y;
                const onMove = (moveEvent: MouseEvent) => {
                  const scale = scaleRef.current || 1;
                  const dx = (moveEvent.clientX - startX) / scale;
                  const dy = (moveEvent.clientY - startY) / scale;
                  updateCroquis(item.id, { x: startItemX + dx, y: startItemY + dy });
                };
                const onUp = () => {
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
            >
              <img src={item.src} className="w-full h-full object-contain" draggable={false} alt="Croquis" />
              {selectedObject?.id === item.id && (
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-popover/95 backdrop-blur border border-border rounded-xl shadow-xl flex items-center p-1.5 gap-2 z-50 pointer-events-auto min-w-[300px]" style={{ transform: `scaleX(${item.isFlipped ? -1 : 1})` }} onMouseDown={e => e.stopPropagation()}>
                  <div className="w-24 px-2 flex items-center gap-2"><Eye className="w-3 h-3 text-muted-foreground" /><Slider value={[item.opacity]} min={0.1} max={1} step={0.1} onValueChange={([v]) => updateCroquis(item.id, { opacity: v })} className="flex-1" /></div>
                  <div className="h-4 w-px bg-border" />
                  <button onClick={() => updateCroquis(item.id, { isLocked: !item.isLocked })} className={cn("p-1.5 hover:bg-muted rounded-lg transition-colors", item.isLocked && "text-destructive bg-destructive/10")} title="Lock">{item.isLocked ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}</button>
                  <button onClick={() => updateCroquis(item.id, { isFlipped: !item.isFlipped })} className={cn("p-1.5 hover:bg-muted rounded-lg transition-colors", item.isFlipped && "bg-muted text-primary")} title="Flip Horizontal"><FlipHorizontal className="w-4 h-4" /></button>
                  <button onClick={() => { const newItem = { ...item, id: crypto.randomUUID(), x: item.x + 30, y: item.y + 30 }; setCroquisItems(prev => [...prev, newItem]); setSelectedObject({ id: newItem.id, type: 'croquis' }); }} className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="Duplicate"><Copy className="w-4 h-4" /></button>
                  <div className="h-4 w-px bg-border" />
                  <button onClick={() => {
                    const dpr = window.devicePixelRatio || 1;
                    const canvasWidth = canvasRef.current ? canvasRef.current.width / dpr : window.innerWidth;
                    const canvasHeight = canvasRef.current ? canvasRef.current.height / dpr : window.innerHeight;
                    if (!offsetRef.current) return;
                    const viewCenterX = -offsetRef.current.x / scale + (canvasWidth / scale / 2);
                    const viewCenterY = -offsetRef.current.y / scale + (canvasHeight / scale / 2);
                    updateCroquis(item.id, { x: viewCenterX - item.width / 2, y: viewCenterY - item.height / 2 });
                  }} className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="Snap to Center"><AlignCenter className="w-4 h-4" /></button>
                  <button onClick={() => updateCroquis(item.id, { width: 300, height: 600 })} className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="Reset Scale"><Maximize2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          ))}
        </div>

        <motion.div className="absolute inset-0 pointer-events-none">
          {/* Grid Canvas - Z-0 */}
          <canvas ref={gridCanvasRef} className="absolute inset-0 pointer-events-none z-0" />
          {/* Main Drawing Canvas - Z-10 */}
          <canvas
            ref={canvasRef}
            className={`w-full h-full touch-none ${tool === 'select' ? 'pointer-events-none' : (isPanning || isSpacePressed ? 'cursor-grab active:cursor-grabbing' : isReadOnly ? 'cursor-not-allowed' : 'cursor-crosshair')}`}
            onMouseDown={(e) => !isReadOnly && !isPanning && !isSpacePressed && tool !== 'select' && startDrawing(e)}
            onMouseMove={(e) => !isReadOnly && !isPanning && !isSpacePressed && tool !== 'select' && draw(e)}
            onMouseUp={(e) => !isReadOnly && stopDrawing()}
            onMouseLeave={(e) => !isReadOnly && stopDrawing()}
            onTouchStart={(e) => !isReadOnly && tool !== 'select' && startDrawing(e)}
            onTouchMove={(e) => !isReadOnly && tool !== 'select' && draw(e)}
            onTouchEnd={(e) => !isReadOnly && stopDrawing()}
          />
        </motion.div>

      </div>



      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <Toolbar
        tool={tool}
        setTool={(newTool) => {
          if (!handleEditAttempt()) return;
          setTool(newTool);
          setSelectedObject(null);
        }}
        brushColor={brushColor}
        setBrushColor={(color) => { if (!handleEditAttempt()) return; setBrushColor(color); }}
        brushWidth={brushWidth}
        setBrushWidth={(width) => { if (!handleEditAttempt()) return; setBrushWidth(width); }}
        stickyColor={stickyColor}
        setStickyColor={setStickyColor}
        fillColor={fillColor}
        setFillColor={setFillColor}
        onUndo={handleUndo}
        onClear={handleClearCanvas}
        onAddCroquis={handleAddCroquis}
      />
      <ParticipantsList participants={participants} currentUserId={user?._id} currentGuestId={guestUser?.guestId} isOpen={isParticipantsListOpen} onClose={() => setIsParticipantsListOpen(false)} />
      <ChatPanel unreadCount={unreadChatCount} messages={messages} users={participants.map((p, i) => ({ id: p.userId || p.guestId || p.socketId, name: p.name, role: p.isOwner ? 'owner' : (p.userId ? 'editor' : 'viewer'), color: PRESENCE_COLORS[i % PRESENCE_COLORS.length], isOnline: true }))} currentUserId={user?._id || guestUser?.guestId || ''} onSendMessage={handleSendMessage} isOpen={isChatOpen} onToggle={() => { setIsChatOpen(!isChatOpen); if (!isChatOpen) { setIsAiChatOpen(false); setUnreadChatCount(0); } }} />
      <AiChatPanel isOpen={isAiChatOpen} onToggle={() => { setIsAiChatOpen(!isAiChatOpen); if (!isAiChatOpen) setIsChatOpen(false); }} stickyNotes={stickyNotes} textItems={textItems} />




      <LoginPromptModal isOpen={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} onSuccess={() => { setShowLoginPrompt(false); window.location.reload(); }} />
      <ConfirmationModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={confirmClearCanvas}
        title="Reset Canvas?"
        message="Are you sure you want to reset the canvas? You can't undo it, and all strokes will be permanently deleted from the database."
        confirmText="Confirm Reset"
        cancelText="Cancel"
      />
      {meetingId && <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} meetingId={meetingId} meetingTitle={sessionName} />}
    </div >
  );
};
export default Canvas;
