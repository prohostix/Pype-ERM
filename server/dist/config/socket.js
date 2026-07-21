import { Server } from 'socket.io';
let io = null;
export const initializeSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5194',
            credentials: true,
            methods: ['GET', 'POST'],
        },
    });
    io.on('connection', (socket) => {
        console.log(`✅ Socket client connected: ${socket.id}`);
        // Join organization room
        socket.on('join-org', (organizationId) => {
            socket.join(`org-${organizationId}`);
            console.log(`User joined org room: org-${organizationId}`);
        });
        // Join role room
        socket.on('join-role', (data) => {
            const roomName = `org-${data.organizationId}-role-${data.role}`;
            socket.join(roomName);
            console.log(`User joined role room: ${roomName}`);
        });
        // Join department room
        socket.on('join-dept', (data) => {
            const roomName = `org-${data.organizationId}-dept-${data.departmentId}`;
            socket.join(roomName);
            console.log(`User joined dept room: ${roomName}`);
        });
        // Join user-specific room
        socket.on('join-user', (userId) => {
            socket.join(`user-${userId}`);
            console.log(`User joined personal room: user-${userId}`);
        });
        socket.on('disconnect', () => {
            console.log(`❌ Socket client disconnected: ${socket.id}`);
        });
    });
    return io;
};
export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized. Call initializeSocket first.');
    }
    return io;
};
// Helper functions to emit events
export const emitToOrganization = (organizationId, event, data) => {
    if (io) {
        io.to(`org-${organizationId}`).emit(event, data);
    }
};
export const emitToRole = (organizationId, role, event, data) => {
    if (io) {
        io.to(`org-${organizationId}-role-${role}`).emit(event, data);
    }
};
export const emitToDepartment = (organizationId, departmentId, event, data) => {
    if (io) {
        io.to(`org-${organizationId}-dept-${departmentId}`).emit(event, data);
    }
};
export const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(`user-${userId}`).emit(event, data);
    }
};
//# sourceMappingURL=socket.js.map