import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const OFFLINE_QUEUE_KEY = 'hiveboard_offline_queue';

const getOfflineQueue = () => {
    try {
        const q = localStorage.getItem(OFFLINE_QUEUE_KEY);
        return q ? JSON.parse(q) : [];
    } catch {
        return [];
    }
};

const pushToQueue = (event: string, data: any) => {
    const q = getOfflineQueue();
    q.push({ event, data });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
};

export const syncOfflineData = () => {
    const q = getOfflineQueue();
    if (q.length === 0) return;
    const socket = getSocket();
    if (socket && socket.connected) {
        q.forEach((item: any) => {
            socket.emit(item.event, item.data);
        });
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
    }
};

const emitSafe = (event: string, data: any) => {
    const socket = getSocket();
    if (navigator.onLine && socket && socket.connected) {
        socket.emit(event, data);
    } else {
        pushToQueue(event, data);
    }
};

let socket: Socket | null = null;

export const getSocket = (): Socket => {
    if (!socket) {
        console.log('🔌 Connecting to Socket.IO server:', SOCKET_URL);
        socket = io(SOCKET_URL, {
            autoConnect: false,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
            transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
            path: '/socket.io/', // Explicit path for socket.io endpoint
            withCredentials: true, // Include credentials for CORS
        });

        // Connection event listeners
        socket.on('connect', () => {
            console.log('✅ Socket connected:', socket?.id);
            syncOfflineData();
        });

        socket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason);
        });

        socket.on('connect_error', (error) => {
            console.error('🔴 Socket connection error:', error);
        });

        socket.on('reconnect', (attemptNumber) => {
            console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
        });

        socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`🔄 Socket reconnection attempt ${attemptNumber}`);
        });

        socket.on('reconnect_failed', () => {
            console.error('🔴 Socket reconnection failed');
        });
    }

    return socket;
};

export const connectSocket = (): void => {
    const socket = getSocket();
    if (!socket.connected) {
        socket.connect();
    }
};

export const disconnectSocket = (): void => {
    if (socket && socket.connected) {
        socket.disconnect();
    }
};

export const joinRoom = (data: {
    roomId: string;
    meetingId?: string;
    userId?: string;
    guestId?: string;
    name: string;
    role?: 'owner' | 'editor' | 'guest';
}): void => {
    const socket = getSocket();
    socket.emit('join-room', data);
};

export const leaveRoom = (): void => {
    const socket = getSocket();
    socket.emit('leave-room');
};

export const getParticipants = (): void => {
    const socket = getSocket();
    socket.emit('get-participants');
};

export const sendCanvasUpdate = (data: {
    meetingId?: string;
    canvasData?: any;
}): void => {
    emitSafe('canvas-update', data);
};

export const sendCursorMove = (position: { x: number; y: number }): void => {
    const socket = getSocket();
    socket.emit('cursor-move', { position });
};

export const sendStroke = (data: {
    meetingId?: string;
    stroke: any;
}): void => {
    emitSafe('draw-stroke', data);
};

export const sendPoint = (data: {
    meetingId?: string;
    point: { x: number; y: number };
    strokeId: string;
    color: string;
    width: number;
    isEraser?: boolean;
}): void => {
    emitSafe('draw-point', data);
};

export const sendClearCanvas = (data: { meetingId?: string }): void => {
    emitSafe('clear-canvas', data);
};

export const sendUndo = (data: { meetingId?: string }): void => {
    emitSafe('undo-stroke', data);
};

export const sendAddCroquis = (data: { meetingId?: string; item: any; }): void => {
    emitSafe('add-croquis', data);
};

export const sendUpdateCroquis = (data: { meetingId?: string; id: string; updates: any; }): void => {
    emitSafe('update-croquis', data);
};

export const sendDeleteCroquis = (data: { meetingId?: string; id: string; }): void => {
    emitSafe('delete-croquis', data);
};

export const sendMessage = (data: {
    meetingId?: string;
    userId?: string;
    guestId?: string;
    name: string;
    content: string;
}): void => {
    console.log('📤 Sending message:', data);
    emitSafe('send-message', data);
};


export const sendAddSticky = (data: { meetingId?: string; note: any; }): void => {
    emitSafe('add-sticky', data);
};

export const sendUpdateSticky = (data: { meetingId?: string; id: string; updates: any; }): void => {
    emitSafe('update-sticky', data);
};

export const sendDeleteSticky = (data: { meetingId?: string; id: string; }): void => {
    emitSafe('delete-sticky', data);
};

export const sendAddText = (data: { meetingId?: string; item: any; }): void => {
    emitSafe('add-text', data);
};

export const sendUpdateText = (data: { meetingId?: string; id: string; updates: any; }): void => {
    emitSafe('update-text', data);
};

export const sendDeleteText = (data: { meetingId?: string; id: string; }): void => {
    emitSafe('delete-text', data);
};

export const sendUpdateStroke = (data: { meetingId?: string; id: string; updates: any; }): void => {
    emitSafe('update-stroke', data);
};

export const sendDeleteStroke = (data: { meetingId?: string; id: string; }): void => {
    emitSafe('delete-stroke', data);
};

export const requestCanvasState = (data: { meetingId: string }): void => {
    const socket = getSocket();
    socket.emit('request-canvas-state', data);
};

export const sendCanvasBackground = (data: { meetingId?: string; color: string }): void => {
    emitSafe('set-canvas-background', data);
};

export default {
    getSocket,
    connectSocket,
    disconnectSocket,
    joinRoom,
    leaveRoom,
    getParticipants,
    sendCanvasUpdate,
    sendCursorMove,
    sendStroke,
    sendPoint,
    sendClearCanvas,
    sendUndo,
    sendAddCroquis,
    sendUpdateCroquis,
    sendDeleteCroquis,
    sendMessage,
    sendCanvasBackground,
    requestCanvasState,
    sendAddSticky,
    sendUpdateSticky,
    sendDeleteSticky,
    sendAddText,
    sendUpdateText,
    sendDeleteText,
    sendUpdateStroke,
    sendDeleteStroke,
};

