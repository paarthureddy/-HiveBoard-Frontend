import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: false,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
        });

        // Connection event listeners
        socket.on('connect', () => {
            console.log('✅ Socket connected:', socket?.id);
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
    const socket = getSocket();
    socket.emit('canvas-update', data);
};

export const sendCursorMove = (position: { x: number; y: number }): void => {
    const socket = getSocket();
    socket.emit('cursor-move', { position });
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
};
