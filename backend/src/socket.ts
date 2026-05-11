import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  // Auth Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      console.warn('🔌 Socket connection rejected: Token missing');
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'iasds_super_secret_key_2024') as any;
      (socket as any).user = decoded;
      next();
    } catch (err) {
      console.error('🔌 Socket connection rejected: Invalid token', (err as any).message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    console.log(`👤 User connected: ${user.name} (${user.role})`);

    // Join room based on role
    socket.join(user.role);
    
    // Join a specific job room if requested
    socket.on('join:job', (jobId: string) => {
      socket.join(`job:${jobId}`);
    });

    socket.on('disconnect', () => {
      console.log('👤 User disconnected');
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};
