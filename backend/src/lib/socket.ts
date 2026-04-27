import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

let io: Server;

export function initSocketServer(server: HttpServer): Server {
    io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: Token missing'));
        }

        try {
            const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET || 'fallback-secret');
            socket.data.user = decoded; // { sub: '...', ... }
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.data.user.sub;
        console.log(`User connected via socket: ${userId} (Socket ID: ${socket.id})`);
        
        // Join a room specifically for this user's notifications
        socket.join(userId);

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${userId} (Socket ID: ${socket.id})`);
        });
    });

    return io;
}

export function getSocketIO() {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
}
