import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';

let io: Server;

export function initSocket(server: HttpServer) {
    io = new Server(server, {
        cors: {
            origin: '*', // Adjust for production
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        socket.on('join-user', (userId: string) => {
            socket.join(`user-${userId}`);
            console.log(`User ${userId} joined their room`);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    return io;
}

export function getIO() {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
}

export function emitToUser(userId: string, event: string, data: any) {
    if (io) {
        io.to(`user-${userId}`).emit(event, data);
    }
}
