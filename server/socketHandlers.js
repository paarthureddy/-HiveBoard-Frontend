import Room from './models/Room.js';
import Meeting from './models/Meeting.js';

export const setupSocketHandlers = (io) => {
    io.on('connection', (socket) => {
        console.log(`✅ Client connected: ${socket.id}`);

        // Join a room
        socket.on('join-room', async (data) => {
            try {
                const { roomId, meetingId, userId, guestId, name, role } = data;

                // Join the socket.io room
                socket.join(roomId);

                // Find or create room
                let room = await Room.findOne({ roomId });

                if (!room && meetingId) {
                    // Create new room if it doesn't exist
                    const meeting = await Meeting.findById(meetingId);
                    if (meeting) {
                        room = await Room.create({
                            meetingId,
                            roomId,
                            owner: meeting.createdBy,
                        });
                    }
                }

                if (room) {
                    // Add connection to active connections
                    room.addConnection({
                        socketId: socket.id,
                        userId: userId || null,
                        guestId: guestId || null,
                        name: name || 'Anonymous',
                    });

                    // Add participant if not already added
                    room.addParticipant({
                        userId: userId || null,
                        guestId: guestId || null,
                        name: name || 'Anonymous',
                        role: role || 'guest',
                    });

                    await room.save();

                    // Store room info in socket
                    socket.roomId = roomId;
                    socket.userId = userId;
                    socket.guestId = guestId;

                    // Get all active participants
                    const participants = room.activeConnections.map(conn => ({
                        socketId: conn.socketId,
                        userId: conn.userId,
                        guestId: conn.guestId,
                        name: conn.name,
                        isOwner: conn.userId && conn.userId.toString() === room.owner.toString(),
                    }));

                    // Notify user they joined
                    socket.emit('room-joined', {
                        roomId,
                        participants,
                        role: userId && userId.toString() === room.owner.toString() ? 'owner' : role || 'guest',
                    });

                    // Notify others in the room
                    socket.to(roomId).emit('user-joined', {
                        socketId: socket.id,
                        userId,
                        guestId,
                        name,
                        participants,
                    });

                    console.log(`👤 User ${name} joined room ${roomId}`);
                }
            } catch (error) {
                console.error('Error joining room:', error);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        // Leave room
        socket.on('leave-room', async () => {
            try {
                if (socket.roomId) {
                    const room = await Room.findOne({ roomId: socket.roomId });

                    if (room) {
                        // Remove connection
                        room.removeConnection(socket.id);
                        await room.save();

                        // Get updated participants
                        const participants = room.activeConnections.map(conn => ({
                            socketId: conn.socketId,
                            userId: conn.userId,
                            guestId: conn.guestId,
                            name: conn.name,
                            isOwner: conn.userId && conn.userId.toString() === room.owner.toString(),
                        }));

                        // Notify others
                        socket.to(socket.roomId).emit('user-left', {
                            socketId: socket.id,
                            participants,
                        });

                        socket.leave(socket.roomId);
                        console.log(`👋 User left room ${socket.roomId}`);
                    }
                }
            } catch (error) {
                console.error('Error leaving room:', error);
            }
        });

        // Get participants
        socket.on('get-participants', async () => {
            try {
                if (socket.roomId) {
                    const room = await Room.findOne({ roomId: socket.roomId });

                    if (room) {
                        const participants = room.activeConnections.map(conn => ({
                            socketId: conn.socketId,
                            userId: conn.userId,
                            guestId: conn.guestId,
                            name: conn.name,
                            isOwner: conn.userId && conn.userId.toString() === room.owner.toString(),
                        }));

                        socket.emit('participants-list', participants);
                    }
                }
            } catch (error) {
                console.error('Error getting participants:', error);
            }
        });

        // Canvas update
        socket.on('canvas-update', async (data) => {
            try {
                if (socket.roomId) {
                    // Broadcast to others in the room
                    socket.to(socket.roomId).emit('canvas-updated', {
                        userId: socket.userId,
                        guestId: socket.guestId,
                        data,
                    });

                    // Optionally save to database
                    if (data.meetingId && data.canvasData) {
                        await Meeting.findByIdAndUpdate(data.meetingId, {
                            canvasData: data.canvasData,
                        });
                    }
                }
            } catch (error) {
                console.error('Error updating canvas:', error);
            }
        });

        // Cursor move (optional - for showing other users' cursors)
        socket.on('cursor-move', (data) => {
            if (socket.roomId) {
                socket.to(socket.roomId).emit('cursor-moved', {
                    socketId: socket.id,
                    userId: socket.userId,
                    guestId: socket.guestId,
                    position: data.position,
                });
            }
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
            try {
                if (socket.roomId) {
                    const room = await Room.findOne({ roomId: socket.roomId });

                    if (room) {
                        // Remove connection
                        room.removeConnection(socket.id);
                        await room.save();

                        // Get updated participants
                        const participants = room.activeConnections.map(conn => ({
                            socketId: conn.socketId,
                            userId: conn.userId,
                            guestId: conn.guestId,
                            name: conn.name,
                            isOwner: conn.userId && conn.userId.toString() === room.owner.toString(),
                        }));

                        // Notify others
                        socket.to(socket.roomId).emit('user-left', {
                            socketId: socket.id,
                            participants,
                        });
                    }
                }
                console.log(`❌ Client disconnected: ${socket.id}`);
            } catch (error) {
                console.error('Error handling disconnect:', error);
            }
        });
    });
};
