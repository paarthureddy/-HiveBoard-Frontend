import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket';
import type { Participant } from '@/types/room';

interface UseSocketOptions {
    onRoomJoined?: (data: { roomId: string; participants: Participant[]; role: string }) => void;
    onUserJoined?: (data: { socketId: string; userId?: string; guestId?: string; name: string; participants: Participant[] }) => void;
    onUserLeft?: (data: { socketId: string; participants: Participant[] }) => void;
    onParticipantsList?: (participants: Participant[]) => void;
    onCanvasUpdated?: (data: { userId?: string; guestId?: string; data: any }) => void;
    onCursorMoved?: (data: { socketId: string; userId?: string; guestId?: string; position: { x: number; y: number } }) => void;
    onStrokeDrawn?: (data: { userId?: string; guestId?: string; stroke: any }) => void;
    onPointDrawn?: (data: { userId?: string; guestId?: string; point: { x: number; y: number }; strokeId: string; color: string; width: number }) => void;
    onCanvasCleared?: (data: { userId?: string; guestId?: string }) => void;
    onStrokeUndone?: (data: { userId?: string; guestId?: string }) => void;
    onCanvasState?: (data: { strokes: any[]; croquis: any[]; stickyNotes?: any[]; textItems?: any[]; backgroundColor?: string; }) => void;
    onCanvasBackgroundChanged?: (data: { color: string }) => void;
    onError?: (data: { message: string }) => void;
    onChatHistory?: (messages: any[]) => void;
    onReceiveMessage?: (message: any) => void;
    onMessageConfirmed?: (message: any) => void;
    onCroquisAdded?: (data: { item: any }) => void;
    onCroquisUpdated?: (data: { id: string; updates: any }) => void;
    onStickyAdded?: (data: { note: any }) => void;
    onStickyUpdated?: (data: { id: string; updates: any }) => void;
    onStickyDeleted?: (data: { id: string }) => void;
    onTextAdded?: (data: { item: any }) => void;
    onTextUpdated?: (data: { id: string; updates: any }) => void;
    onTextDeleted?: (data: { id: string }) => void;
    onStrokeUpdated?: (data: { id: string; updates: any }) => void;
}

/**
 * useSocket Hook
 * 
 * This hook manages the WebSocket connection for real-time collaboration.
 * It serves as a bridge between the React application and the Socket.io client.
 * 
 * Features:
 * - Connects to the backend socket server.
 * - Proxies socket events to the provided callback functions (options).
 * - Handles user joining/leaving, drawing updates, chat messages, and object manipulation events.
 */
export const useSocket = (options: UseSocketOptions = {}) => {
    const socketRef = useRef<Socket | null>(null);
    const optionsRef = useRef(options);

    // Keep options ref updated
    useEffect(() => {
        optionsRef.current = options;
    });

    useEffect(() => {
        // Get socket instance
        socketRef.current = getSocket();
        const socket = socketRef.current;

        // Connect socket
        connectSocket();

        // Create stable listeners that call the latest options from ref
        const handleRoomJoined = (data: any) => optionsRef.current.onRoomJoined?.(data);
        const handleUserJoined = (data: any) => optionsRef.current.onUserJoined?.(data);
        const handleUserLeft = (data: any) => optionsRef.current.onUserLeft?.(data);
        const handleParticipantsList = (data: any) => optionsRef.current.onParticipantsList?.(data);
        const handleCanvasUpdated = (data: any) => optionsRef.current.onCanvasUpdated?.(data);
        const handleCursorMoved = (data: any) => optionsRef.current.onCursorMoved?.(data);
        const handleStrokeDrawn = (data: any) => optionsRef.current.onStrokeDrawn?.(data);
        const handlePointDrawn = (data: any) => optionsRef.current.onPointDrawn?.(data);
        const handleCanvasCleared = (data: any) => optionsRef.current.onCanvasCleared?.(data);
        const handleStrokeUndone = (data: any) => optionsRef.current.onStrokeUndone?.(data);
        const handleCanvasState = (data: any) => optionsRef.current.onCanvasState?.(data);
        const handleError = (data: any) => optionsRef.current.onError?.(data);
        const handleChatHistory = (data: any) => optionsRef.current.onChatHistory?.(data);
        const handleReceiveMessage = (data: any) => optionsRef.current.onReceiveMessage?.(data);
        const handleMessageConfirmed = (data: any) => optionsRef.current.onMessageConfirmed?.(data);
        const handleCroquisAdded = (data: any) => optionsRef.current.onCroquisAdded?.(data);
        const handleCroquisUpdated = (data: any) => optionsRef.current.onCroquisUpdated?.(data);
        const handleStickyAdded = (data: any) => optionsRef.current.onStickyAdded?.(data);
        const handleStickyUpdated = (data: any) => optionsRef.current.onStickyUpdated?.(data);
        const handleStickyDeleted = (data: any) => optionsRef.current.onStickyDeleted?.(data);
        const handleTextAdded = (data: any) => optionsRef.current.onTextAdded?.(data);
        const handleTextUpdated = (data: any) => optionsRef.current.onTextUpdated?.(data);
        const handleTextDeleted = (data: any) => optionsRef.current.onTextDeleted?.(data);
        const handleStrokeUpdated = (data: any) => optionsRef.current.onStrokeUpdated?.(data);
        const handleCanvasBackgroundChanged = (data: any) => optionsRef.current.onCanvasBackgroundChanged?.(data);

        // Set up event listeners
        socket.on('room-joined', handleRoomJoined);
        socket.on('user-joined', handleUserJoined);
        socket.on('user-left', handleUserLeft);
        socket.on('participants-list', handleParticipantsList);
        socket.on('canvas-updated', handleCanvasUpdated);
        socket.on('cursor-moved', handleCursorMoved);
        socket.on('draw-stroke', handleStrokeDrawn);
        socket.on('draw-point', handlePointDrawn);
        socket.on('clear-canvas', handleCanvasCleared);
        socket.on('undo-stroke', handleStrokeUndone);
        socket.on('canvas-state', handleCanvasState);
        socket.on('chat-history', handleChatHistory);
        socket.on('receive-message', handleReceiveMessage);
        socket.on('message-confirmed', handleMessageConfirmed);
        socket.on('add-croquis', handleCroquisAdded);
        socket.on('update-croquis', handleCroquisUpdated);
        socket.on('add-sticky', handleStickyAdded);
        socket.on('update-sticky', handleStickyUpdated);
        socket.on('delete-sticky', handleStickyDeleted);
        socket.on('add-text', handleTextAdded);
        socket.on('update-text', handleTextUpdated);
        socket.on('delete-text', handleTextDeleted);
        socket.on('update-stroke', handleStrokeUpdated);
        socket.on('error', handleError);

        // Cleanup on unmount
        return () => {
            socket.off('room-joined', handleRoomJoined);
            socket.off('user-joined', handleUserJoined);
            socket.off('user-left', handleUserLeft);
            socket.off('participants-list', handleParticipantsList);
            socket.off('canvas-updated', handleCanvasUpdated);
            socket.off('cursor-moved', handleCursorMoved);
            socket.off('error', handleError);
            socket.off('draw-stroke', handleStrokeDrawn);
            socket.off('draw-point', handlePointDrawn);
            socket.off('clear-canvas', handleCanvasCleared);
            socket.off('undo-stroke', handleStrokeUndone);
            socket.off('canvas-state', handleCanvasState);
            socket.off('chat-history', handleChatHistory);
            socket.off('receive-message', handleReceiveMessage);
            socket.off('message-confirmed', handleMessageConfirmed);
            socket.off('add-croquis', handleCroquisAdded);
            socket.off('update-croquis', handleCroquisUpdated);
            socket.off('add-sticky', handleStickyAdded);
            socket.off('update-sticky', handleStickyUpdated);
            socket.off('delete-sticky', handleStickyDeleted);
            socket.off('add-text', handleTextAdded);
            socket.off('update-text', handleTextUpdated);
            socket.off('delete-text', handleTextDeleted);
            socket.off('update-stroke', handleStrokeUpdated);

            disconnectSocket();
        };
    }, []);

    const getSocketInstance = useCallback(() => socketRef.current, []);

    return {
        socket: socketRef.current,
        getSocket: getSocketInstance,
    };
};
